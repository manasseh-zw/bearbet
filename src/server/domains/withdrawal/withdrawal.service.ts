import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";

import { applyWalletOperationInTransaction } from "#/server/domains/wallet/wallet.service";
import {
	type RequestWithdrawalCommand,
	type RequestWithdrawalInput,
	type ReviewWithdrawalCommand,
	type ReviewWithdrawalInput,
	requestWithdrawalSchema,
	reviewWithdrawalSchema,
} from "#/server/domains/withdrawal/withdrawal.schema";
import { db } from "#/server/infra/db";
import { user, wallet, withdrawal } from "#/server/infra/db/schema";

export class WithdrawalServiceError extends Error {
	constructor(
		message: string,
		readonly code:
			| "INVALID_WITHDRAWAL"
			| "WITHDRAWAL_NOT_FOUND"
			| "IDEMPOTENCY_CONFLICT"
			| "ALREADY_REVIEWED"
			| "ADMIN_REQUIRED",
	) {
		super(message);
		this.name = "WithdrawalServiceError";
	}
}

export async function requestWithdrawal(input: RequestWithdrawalInput) {
	const command = parseWithdrawalRequest(input);

	return db.transaction(async (transaction) => {
		const [currentWallet] = await transaction
			.select({
				id: wallet.id,
				currencyCode: wallet.currencyCode,
			})
			.from(wallet)
			.where(eq(wallet.playerId, command.playerId))
			.for("update");
		if (!currentWallet) {
			throw new WithdrawalServiceError(
				"Player wallet was not found",
				"INVALID_WITHDRAWAL",
			);
		}

		const [existing] = await transaction
			.select()
			.from(withdrawal)
			.where(eq(withdrawal.idempotencyKey, command.idempotencyKey));
		if (existing) {
			if (
				existing.playerId !== command.playerId ||
				existing.requestedAmountMinor !== command.amountMinor
			) {
				throw new WithdrawalServiceError(
					"Idempotency key was used for another withdrawal",
					"IDEMPOTENCY_CONFLICT",
				);
			}
			return { withdrawal: existing, isDuplicate: true };
		}

		const withdrawalId = crypto.randomUUID();
		await applyWalletOperationInTransaction(transaction, {
			playerId: command.playerId,
			type: "withdrawal_reserve",
			idempotencyKey: `withdrawal:${withdrawalId}:reserve`,
			movements: [
				{ bucket: "cash", amountMinor: -command.amountMinor },
				{ bucket: "reserved_cash", amountMinor: command.amountMinor },
			],
			sourceType: "withdrawal",
			sourceId: withdrawalId,
		});

		const [created] = await transaction
			.insert(withdrawal)
			.values({
				id: withdrawalId,
				playerId: command.playerId,
				currencyCode: currentWallet.currencyCode,
				requestedAmountMinor: command.amountMinor,
				reservedAmountMinor: command.amountMinor,
				idempotencyKey: command.idempotencyKey,
			})
			.returning();
		if (!created) {
			throw new WithdrawalServiceError(
				"Withdrawal was not created",
				"INVALID_WITHDRAWAL",
			);
		}
		return { withdrawal: created, isDuplicate: false };
	});
}

export async function reviewWithdrawal(input: ReviewWithdrawalInput) {
	const command = parseWithdrawalReview(input);

	return db.transaction(async (transaction) => {
		const [reviewer] = await transaction
			.select({ role: user.role, banned: user.banned })
			.from(user)
			.where(eq(user.id, command.reviewerUserId));
		if (!reviewer || reviewer.role !== "admin" || reviewer.banned) {
			throw new WithdrawalServiceError(
				"An active administrator must review withdrawals",
				"ADMIN_REQUIRED",
			);
		}

		const [current] = await transaction
			.select()
			.from(withdrawal)
			.where(eq(withdrawal.id, command.withdrawalId))
			.for("update");
		if (!current) {
			throw new WithdrawalServiceError(
				"Withdrawal was not found",
				"WITHDRAWAL_NOT_FOUND",
			);
		}

		const nextStatus = command.decision === "approve" ? "approved" : "rejected";
		if (current.status !== "pending") {
			if (current.status === nextStatus) {
				return { withdrawal: current, isDuplicate: true };
			}
			throw new WithdrawalServiceError(
				"Withdrawal already has a different decision",
				"ALREADY_REVIEWED",
			);
		}

		await applyWalletOperationInTransaction(transaction, {
			playerId: current.playerId,
			type:
				command.decision === "approve"
					? "withdrawal_debit"
					: "withdrawal_release",
			idempotencyKey: `withdrawal:${current.id}:${command.decision}`,
			movements:
				command.decision === "approve"
					? [
							{
								bucket: "reserved_cash",
								amountMinor: -current.reservedAmountMinor,
							},
						]
					: [
							{
								bucket: "reserved_cash",
								amountMinor: -current.reservedAmountMinor,
							},
							{ bucket: "cash", amountMinor: current.reservedAmountMinor },
						],
			sourceType: "withdrawal",
			sourceId: current.id,
			actorUserId: command.reviewerUserId,
		});

		const [reviewed] = await transaction
			.update(withdrawal)
			.set({
				status: nextStatus,
				reviewerUserId: command.reviewerUserId,
				reviewReason: command.reason,
				reviewedAt: command.now ?? new Date(),
			})
			.where(eq(withdrawal.id, current.id))
			.returning();
		if (!reviewed) {
			throw new WithdrawalServiceError(
				"Withdrawal review failed",
				"INVALID_WITHDRAWAL",
			);
		}
		return { withdrawal: reviewed, isDuplicate: false };
	});
}

function parseWithdrawalRequest(
	input: RequestWithdrawalInput,
): RequestWithdrawalCommand {
	const result = requestWithdrawalSchema.safeParse(input);
	if (!result.success) {
		throw new WithdrawalServiceError(
			result.error.issues[0]?.message ?? "Withdrawal request is invalid",
			"INVALID_WITHDRAWAL",
		);
	}
	return result.data;
}

function parseWithdrawalReview(
	input: ReviewWithdrawalInput,
): ReviewWithdrawalCommand {
	const result = reviewWithdrawalSchema.safeParse(input);
	if (!result.success) {
		throw new WithdrawalServiceError(
			result.error.issues[0]?.message ?? "Withdrawal review is invalid",
			"INVALID_WITHDRAWAL",
		);
	}
	return result.data;
}
