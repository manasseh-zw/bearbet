import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";
import { ZodError } from "zod";

import {
	type ActivateUserInput,
	type AdjustUserBalanceInput,
	type AssignUserBonusInput,
	activateUserInputSchema,
	adjustUserBalanceInputSchema,
	assignUserBonusInputSchema,
	type SuspendUserInput,
	suspendUserInputSchema,
} from "#/lib/schemas/admin-user.schema";
import {
	AdminAuthorizationError,
	assertActiveAdminInTransaction,
} from "#/server/domains/admin/admin-auth.service";
import { recordAuditEntryInTransaction } from "#/server/domains/audit/audit.service";
import { activateBonusAwardInTransaction } from "#/server/domains/bonus/bonus.service";
import { applyWalletOperationInTransaction } from "#/server/domains/wallet/wallet.service";
import { db } from "#/server/infra/db";
import type { DatabaseTransaction } from "#/server/infra/db/database.types";
import { player, session, user, wallet } from "#/server/infra/db/schema";

export class AdminUserServiceError extends Error {
	constructor(
		message: string,
		readonly code:
			| "INVALID_INPUT"
			| "ADMIN_REQUIRED"
			| "USER_NOT_FOUND"
			| "SELF_SUSPENSION"
			| "WALLET_NOT_FOUND"
			| "PLAYER_NOT_FOUND"
			| "BONUS_NOT_FOUND",
	) {
		super(message);
		this.name = "AdminUserServiceError";
	}
}

export async function suspendAdminUser(
	input: SuspendUserInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		suspendUserInputSchema.parse({
			userId: input.userId,
			reason: input.reason,
		}),
	);
	return db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		if (input.actorUserId === command.userId) {
			throw new AdminUserServiceError(
				"An administrator cannot suspend their own account",
				"SELF_SUSPENSION",
			);
		}

		const target = await lockTarget(transaction, command.userId);
		if (!target) throw userNotFound();
		if (target.banned) return { isDuplicate: true, userId: target.id };

		const [updated] = await transaction
			.update(user)
			.set({ banned: true, banReason: command.reason })
			.where(eq(user.id, command.userId))
			.returning({ id: user.id });
		if (!updated) throw userNotFound();

		await transaction.delete(session).where(eq(session.userId, command.userId));
		await recordAuditEntryInTransaction(transaction, {
			actorUserId: input.actorUserId,
			target: { type: "user", id: command.userId },
			action: "user_suspended",
			reason: command.reason,
			metadata: { previousStatus: "active", nextStatus: "suspended" },
		});

		return { isDuplicate: false, userId: updated.id };
	});
}

export async function activateAdminUser(
	input: ActivateUserInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		activateUserInputSchema.parse({
			userId: input.userId,
			reason: input.reason,
		}),
	);
	return db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		const target = await lockTarget(transaction, command.userId);
		if (!target) throw userNotFound();
		if (!target.banned) return { isDuplicate: true, userId: target.id };

		const [updated] = await transaction
			.update(user)
			.set({ banned: false, banReason: null, banExpires: null })
			.where(eq(user.id, command.userId))
			.returning({ id: user.id });
		if (!updated) throw userNotFound();

		await recordAuditEntryInTransaction(transaction, {
			actorUserId: input.actorUserId,
			target: { type: "user", id: command.userId },
			action: "user_activated",
			reason: command.reason,
			metadata: { previousStatus: "suspended", nextStatus: "active" },
		});

		return { isDuplicate: false, userId: updated.id };
	});
}

export async function adjustAdminUserBalance(
	input: AdjustUserBalanceInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		adjustUserBalanceInputSchema.parse({
			userId: input.userId,
			amountMinor: input.amountMinor,
			reason: input.reason,
			idempotencyKey: input.idempotencyKey,
		}),
	);
	return db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		const target = await lockTarget(transaction, command.userId);
		if (!target) throw userNotFound();

		const [currentWallet] = await transaction
			.select()
			.from(wallet)
			.where(eq(wallet.playerId, command.userId))
			.for("update");
		if (!currentWallet) {
			throw new AdminUserServiceError(
				"The user does not have a wallet",
				"WALLET_NOT_FOUND",
			);
		}

		const operation = await applyWalletOperationInTransaction(transaction, {
			playerId: command.userId,
			type: "admin_adjustment",
			idempotencyKey: command.idempotencyKey,
			movements: [{ bucket: "cash", amountMinor: command.amountMinor }],
			sourceType: "admin_adjustment",
			sourceId: command.userId,
			actorUserId: input.actorUserId,
		});

		if (!operation.isDuplicate) {
			await recordAuditEntryInTransaction(transaction, {
				actorUserId: input.actorUserId,
				target: { type: "user", id: command.userId },
				action: "balance_adjusted",
				reason: command.reason,
				metadata: {
					idempotencyKey: command.idempotencyKey,
					amountMinor: command.amountMinor,
					currencyCode: currentWallet.currencyCode,
					walletOperationId: operation.operationId,
					walletPublicReference: operation.publicReference,
					balances: operation.balances,
				},
			});
		}

		return operation;
	});
}

export async function assignAdminUserBonus(
	input: AssignUserBonusInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		assignUserBonusInputSchema.parse({
			userId: input.userId,
			definitionId: input.definitionId,
			reason: input.reason,
			idempotencyKey: input.idempotencyKey,
		}),
	);
	return db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		const target = await lockTarget(transaction, command.userId);
		if (!target) throw userNotFound();

		const [targetPlayer] = await transaction
			.select({ userId: player.userId })
			.from(player)
			.where(eq(player.userId, command.userId));
		if (!targetPlayer) {
			throw new AdminUserServiceError(
				"The user does not have a player profile",
				"PLAYER_NOT_FOUND",
			);
		}

		const result = await activateBonusAwardInTransaction(transaction, {
			playerId: command.userId,
			definitionId: command.definitionId,
			idempotencyKey: command.idempotencyKey,
			actorUserId: input.actorUserId,
		});

		if (!result.isDuplicate) {
			await recordAuditEntryInTransaction(transaction, {
				actorUserId: input.actorUserId,
				target: { type: "bonus_award", id: result.award.id },
				action: "bonus_activated",
				reason: command.reason,
				metadata: {
					definitionId: command.definitionId,
					playerId: command.userId,
					idempotencyKey: command.idempotencyKey,
					awardedAmountMinor: result.award.awardedAmountMinor,
				},
			});
		}

		return result;
	});
}

async function assertAdmin(
	transaction: DatabaseTransaction,
	actorUserId: string,
) {
	try {
		return await assertActiveAdminInTransaction(transaction, actorUserId);
	} catch (error) {
		if (error instanceof AdminAuthorizationError) {
			throw new AdminUserServiceError(
				"An active administrator is required",
				"ADMIN_REQUIRED",
			);
		}
		throw error;
	}
}

async function lockTarget(transaction: DatabaseTransaction, userId: string) {
	const [target] = await transaction
		.select({ id: user.id, banned: user.banned })
		.from(user)
		.where(eq(user.id, userId))
		.for("update");
	return target;
}

function userNotFound() {
	return new AdminUserServiceError("User was not found", "USER_NOT_FOUND");
}

function parseInput<T>(parse: () => T) {
	try {
		return parse();
	} catch (error) {
		if (error instanceof ZodError) {
			throw new AdminUserServiceError(
				error.issues[0]?.message ?? "User action is invalid",
				"INVALID_INPUT",
			);
		}
		throw error;
	}
}
