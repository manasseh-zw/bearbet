import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";

import { assertPositiveMinorUnits } from "#/server/domains/wallet/wallet.policy";
import { applyWalletOperationInTransaction } from "#/server/domains/wallet/wallet.service";
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

export async function requestWithdrawal(input: {
	playerId: string;
	amountMinor: number;
	idempotencyKey: string;
}) {
	assertPositiveMinorUnits(input.amountMinor, "Withdrawal amount");
	if (!input.playerId.trim() || !input.idempotencyKey.trim()) {
		throw new WithdrawalServiceError(
			"Player and idempotency key are required",
			"INVALID_WITHDRAWAL",
		);
	}

	return db.transaction(async (transaction) => {
		const [currentWallet] = await transaction
			.select({
				id: wallet.id,
				currencyCode: wallet.currencyCode,
			})
			.from(wallet)
			.where(eq(wallet.playerId, input.playerId))
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
			.where(eq(withdrawal.idempotencyKey, input.idempotencyKey));
		if (existing) {
			if (
				existing.playerId !== input.playerId ||
				existing.requestedAmountMinor !== input.amountMinor
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
			playerId: input.playerId,
			type: "withdrawal_reserve",
			idempotencyKey: `withdrawal:${withdrawalId}:reserve`,
			movements: [
				{ bucket: "cash", amountMinor: -input.amountMinor },
				{ bucket: "reserved_cash", amountMinor: input.amountMinor },
			],
			sourceType: "withdrawal",
			sourceId: withdrawalId,
		});

		const [created] = await transaction
			.insert(withdrawal)
			.values({
				id: withdrawalId,
				playerId: input.playerId,
				currencyCode: currentWallet.currencyCode,
				requestedAmountMinor: input.amountMinor,
				reservedAmountMinor: input.amountMinor,
				idempotencyKey: input.idempotencyKey,
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

export async function reviewWithdrawal(input: {
	withdrawalId: string;
	reviewerUserId: string;
	decision: "approve" | "reject";
	reason: string;
	now?: Date;
}) {
	const reason = input.reason.trim();
	if (!reason) {
		throw new WithdrawalServiceError(
			"A review reason is required",
			"INVALID_WITHDRAWAL",
		);
	}

	return db.transaction(async (transaction) => {
		const [reviewer] = await transaction
			.select({ role: user.role, banned: user.banned })
			.from(user)
			.where(eq(user.id, input.reviewerUserId));
		if (!reviewer || reviewer.role !== "admin" || reviewer.banned) {
			throw new WithdrawalServiceError(
				"An active administrator must review withdrawals",
				"ADMIN_REQUIRED",
			);
		}

		const [current] = await transaction
			.select()
			.from(withdrawal)
			.where(eq(withdrawal.id, input.withdrawalId))
			.for("update");
		if (!current) {
			throw new WithdrawalServiceError(
				"Withdrawal was not found",
				"WITHDRAWAL_NOT_FOUND",
			);
		}

		const nextStatus = input.decision === "approve" ? "approved" : "rejected";
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
				input.decision === "approve"
					? "withdrawal_debit"
					: "withdrawal_release",
			idempotencyKey: `withdrawal:${current.id}:${input.decision}`,
			movements:
				input.decision === "approve"
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
			actorUserId: input.reviewerUserId,
		});

		const [reviewed] = await transaction
			.update(withdrawal)
			.set({
				status: nextStatus,
				reviewerUserId: input.reviewerUserId,
				reviewReason: reason,
				reviewedAt: input.now ?? new Date(),
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
