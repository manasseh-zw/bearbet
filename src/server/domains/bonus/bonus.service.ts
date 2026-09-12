import "@tanstack/react-start/server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
	calculateRequiredWager,
	determineActiveAwardOutcome,
} from "#/server/domains/bonus/bonus.policy";
import {
	applyWalletOperationInTransaction,
	type DatabaseTransaction,
} from "#/server/domains/wallet/wallet.service";
import { db } from "#/server/infra/db";
import {
	bonusAward,
	bonusDefinition,
	ledgerEntry,
	providerOperation,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

type BonusDefinitionType = (typeof bonusDefinition.type.enumValues)[number];

export type CreateBonusDefinitionInput = {
	code: string;
	name: string;
	description?: string;
	type: BonusDefinitionType;
	amountMinor: number;
	wageringMultiplier: number;
	expiresAfterDays: number;
	minimumDepositMinor?: number;
	maximumAwardMinor?: number;
	eligibleGameIds?: string[];
	eligibleCategories?: string[];
	eligibleProviders?: string[];
};

export class BonusServiceError extends Error {
	constructor(
		message: string,
		readonly code:
			| "INVALID_BONUS"
			| "BONUS_NOT_FOUND"
			| "BONUS_UNAVAILABLE"
			| "BONUS_ALREADY_CLAIMED"
			| "ACTIVE_BONUS_EXISTS"
			| "DEPOSIT_NOT_ELIGIBLE"
			| "IDEMPOTENCY_CONFLICT"
			| "INVALID_TRANSITION",
	) {
		super(message);
		this.name = "BonusServiceError";
	}
}

export async function createBonusDefinition(input: CreateBonusDefinitionInput) {
	const values = validateDefinition(input);
	const [definition] = await db
		.insert(bonusDefinition)
		.values(values)
		.returning();
	if (!definition) {
		throw new BonusServiceError(
			"Bonus definition was not created",
			"INVALID_BONUS",
		);
	}
	return definition;
}

export async function activateBonusAward(input: {
	playerId: string;
	definitionId: string;
	idempotencyKey: string;
	qualifyingDepositOperationId?: string;
	now?: Date;
}) {
	return db.transaction(async (transaction) => {
		const [playerWallet] = await transaction
			.select({ id: wallet.id })
			.from(wallet)
			.where(eq(wallet.playerId, input.playerId))
			.for("update");
		if (!playerWallet) {
			throw new BonusServiceError(
				"Player wallet was not found",
				"BONUS_UNAVAILABLE",
			);
		}

		const [existing] = await transaction
			.select()
			.from(bonusAward)
			.where(eq(bonusAward.idempotencyKey, input.idempotencyKey));
		if (existing) {
			if (
				existing.playerId !== input.playerId ||
				existing.definitionId !== input.definitionId ||
				existing.qualifyingDepositOperationId !==
					(input.qualifyingDepositOperationId ?? null)
			) {
				throw new BonusServiceError(
					"Idempotency key was used for another bonus award",
					"IDEMPOTENCY_CONFLICT",
				);
			}
			return { award: existing, isDuplicate: true };
		}

		const [definition] = await transaction
			.select()
			.from(bonusDefinition)
			.where(eq(bonusDefinition.id, input.definitionId));
		if (!definition) {
			throw new BonusServiceError(
				"Bonus definition was not found",
				"BONUS_NOT_FOUND",
			);
		}
		if (!definition.isActive) {
			throw new BonusServiceError("Bonus is not active", "BONUS_UNAVAILABLE");
		}

		const [alreadyClaimed] = await transaction
			.select({ id: bonusAward.id })
			.from(bonusAward)
			.where(
				and(
					eq(bonusAward.playerId, input.playerId),
					eq(bonusAward.definitionId, input.definitionId),
				),
			);
		if (alreadyClaimed) {
			throw new BonusServiceError(
				"Player has already claimed this bonus",
				"BONUS_ALREADY_CLAIMED",
			);
		}

		const [activeAward] = await transaction
			.select({ id: bonusAward.id })
			.from(bonusAward)
			.where(
				and(
					eq(bonusAward.playerId, input.playerId),
					eq(bonusAward.status, "active"),
				),
			);
		if (activeAward) {
			throw new BonusServiceError(
				"Player already has an active bonus",
				"ACTIVE_BONUS_EXISTS",
			);
		}

		await validateQualifyingDeposit(transaction, definition, input);

		const now = input.now ?? new Date();
		const amountMinor = Math.min(
			definition.amountMinor,
			definition.maximumAwardMinor ?? definition.amountMinor,
		);
		const expiresAt = new Date(now);
		expiresAt.setUTCDate(expiresAt.getUTCDate() + definition.expiresAfterDays);

		const [award] = await transaction
			.insert(bonusAward)
			.values({
				definitionId: definition.id,
				playerId: input.playerId,
				qualifyingDepositOperationId: input.qualifyingDepositOperationId,
				awardedAmountMinor: amountMinor,
				bonusBalanceMinor: amountMinor,
				requiredWagerMinor: calculateRequiredWager(
					amountMinor,
					definition.wageringMultiplier,
				),
				eligibleGameIds: definition.eligibleGameIds,
				eligibleCategories: definition.eligibleCategories,
				eligibleProviders: definition.eligibleProviders,
				idempotencyKey: input.idempotencyKey,
				activatedAt: now,
				expiresAt,
			})
			.returning();
		if (!award) {
			throw new BonusServiceError(
				"Bonus award was not created",
				"INVALID_BONUS",
			);
		}

		await applyWalletOperationInTransaction(transaction, {
			playerId: input.playerId,
			type: "bonus_credit",
			idempotencyKey: `bonus-award:${award.id}:credit`,
			movements: [{ bucket: "bonus", amountMinor }],
			sourceType: "bonus_award",
			sourceId: award.id,
		});

		return { award, isDuplicate: false };
	});
}

export async function settleBonusAward(input: {
	awardId: string;
	reason: "evaluate" | "expire" | "cancel";
	now?: Date;
}) {
	return db.transaction(async (transaction) => {
		const unsettledOperationCount = await countUnsettledAwardBets(
			transaction,
			input.awardId,
		);
		return settleBonusAwardInTransaction(transaction, {
			...input,
			unsettledOperationCount,
		});
	});
}

export async function settleBonusAwardInTransaction(
	transaction: DatabaseTransaction,
	input: {
		awardId: string;
		reason: "evaluate" | "expire" | "cancel";
		unsettledOperationCount?: number;
		now?: Date;
	},
) {
	const [award] = await transaction
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, input.awardId))
		.for("update");
	if (!award) {
		throw new BonusServiceError("Bonus award was not found", "BONUS_NOT_FOUND");
	}
	if (award.status !== "active") {
		return { award, isDuplicate: true };
	}

	const now = input.now ?? new Date();
	const outcome =
		input.reason === "cancel"
			? "cancelled"
			: determineActiveAwardOutcome({
					completedWagerMinor: award.completedWagerMinor,
					requiredWagerMinor: award.requiredWagerMinor,
					bonusBalanceMinor: award.bonusBalanceMinor,
					unsettledOperationCount: input.unsettledOperationCount ?? 0,
					expiresAt: award.expiresAt,
					now,
				});

	if (input.reason === "expire" && outcome !== "expired") {
		throw new BonusServiceError(
			"Bonus has not reached its expiry time",
			"INVALID_TRANSITION",
		);
	}
	if (input.reason === "evaluate" && outcome === "expired") {
		throw new BonusServiceError(
			"Use the expiry transition for an expired bonus",
			"INVALID_TRANSITION",
		);
	}
	if (outcome === "active") return { award, isDuplicate: false };

	if (award.bonusBalanceMinor > 0) {
		const movements =
			outcome === "completed"
				? [
						{
							bucket: "bonus" as const,
							amountMinor: -award.bonusBalanceMinor,
						},
						{ bucket: "cash" as const, amountMinor: award.bonusBalanceMinor },
					]
				: [
						{
							bucket: "bonus" as const,
							amountMinor: -award.bonusBalanceMinor,
						},
					];
		await applyWalletOperationInTransaction(transaction, {
			playerId: award.playerId,
			type: outcome === "completed" ? "bonus_conversion" : "bonus_forfeit",
			idempotencyKey: `bonus-award:${award.id}:${outcome}`,
			movements,
			sourceType: "bonus_award",
			sourceId: award.id,
		});
	}

	const transitionTime = {
		completed: { completedAt: now },
		exhausted: { exhaustedAt: now },
		expired: { expiredAt: now },
		cancelled: { cancelledAt: now },
	}[outcome];
	const [updated] = await transaction
		.update(bonusAward)
		.set({
			status: outcome,
			bonusBalanceMinor: 0,
			...transitionTime,
		})
		.where(eq(bonusAward.id, award.id))
		.returning();
	if (!updated) {
		throw new BonusServiceError(
			"Bonus transition failed",
			"INVALID_TRANSITION",
		);
	}
	return { award: updated, isDuplicate: false };
}

async function validateQualifyingDeposit(
	transaction: DatabaseTransaction,
	definition: typeof bonusDefinition.$inferSelect,
	input: {
		playerId: string;
		qualifyingDepositOperationId?: string;
	},
) {
	if (definition.type !== "deposit") return;
	if (!input.qualifyingDepositOperationId) {
		throw new BonusServiceError(
			"Deposit bonus needs a qualifying top-up",
			"DEPOSIT_NOT_ELIGIBLE",
		);
	}

	const [deposit] = await transaction
		.select({
			operation: walletOperation,
			walletPlayerId: wallet.playerId,
		})
		.from(walletOperation)
		.innerJoin(wallet, eq(walletOperation.walletId, wallet.id))
		.where(eq(walletOperation.id, input.qualifyingDepositOperationId));
	if (
		!deposit ||
		deposit.operation.type !== "demo_top_up" ||
		deposit.walletPlayerId !== input.playerId
	) {
		throw new BonusServiceError(
			"Top-up does not qualify for this player",
			"DEPOSIT_NOT_ELIGIBLE",
		);
	}
	const [usedDeposit] = await transaction
		.select({ id: bonusAward.id })
		.from(bonusAward)
		.where(
			eq(
				bonusAward.qualifyingDepositOperationId,
				input.qualifyingDepositOperationId,
			),
		);
	if (usedDeposit) {
		throw new BonusServiceError(
			"Top-up has already funded another bonus",
			"DEPOSIT_NOT_ELIGIBLE",
		);
	}

	const depositEntries = await transaction
		.select({ amountMinor: ledgerEntry.amountMinor })
		.from(ledgerEntry)
		.where(eq(ledgerEntry.operationId, deposit.operation.id));
	const depositedMinor = depositEntries.reduce(
		(total, entry) => total + Math.max(0, entry.amountMinor),
		0,
	);
	if (depositedMinor < (definition.minimumDepositMinor ?? 0)) {
		throw new BonusServiceError(
			"Top-up is below the bonus minimum",
			"DEPOSIT_NOT_ELIGIBLE",
		);
	}
}

function validateDefinition(input: CreateBonusDefinitionInput) {
	const code = input.code.trim().toUpperCase();
	const name = input.name.trim();
	if (!/^[A-Z0-9_-]{3,64}$/.test(code) || !name || name.length > 120) {
		throw new BonusServiceError(
			"Bonus code or name is invalid",
			"INVALID_BONUS",
		);
	}
	calculateRequiredWager(input.amountMinor, input.wageringMultiplier);
	if (
		!Number.isSafeInteger(input.expiresAfterDays) ||
		input.expiresAfterDays < 1
	) {
		throw new BonusServiceError(
			"Bonus expiry must be at least one day",
			"INVALID_BONUS",
		);
	}
	for (const amount of [input.minimumDepositMinor, input.maximumAwardMinor]) {
		if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0)) {
			throw new BonusServiceError(
				"Bonus money values are invalid",
				"INVALID_BONUS",
			);
		}
	}
	if (input.maximumAwardMinor === 0) {
		throw new BonusServiceError(
			"Maximum award must be positive",
			"INVALID_BONUS",
		);
	}
	return {
		...input,
		code,
		name,
		description: input.description?.trim() || undefined,
		eligibleGameIds: normalizeRules(input.eligibleGameIds),
		eligibleCategories: normalizeRules(input.eligibleCategories),
		eligibleProviders: normalizeRules(input.eligibleProviders),
	};
}

function normalizeRules(values: string[] | undefined) {
	return [
		...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
	];
}

async function countUnsettledAwardBets(
	transaction: DatabaseTransaction,
	awardId: string,
) {
	const bets = await transaction
		.select({
			id: providerOperation.id,
			amountMinor: providerOperation.amountMinor,
			refundedCashMinor: providerOperation.refundedCashMinor,
			refundedBonusMinor: providerOperation.refundedBonusMinor,
		})
		.from(providerOperation)
		.where(
			and(
				eq(providerOperation.type, "bet"),
				eq(providerOperation.bonusAwardId, awardId),
			),
		);
	if (bets.length === 0) return 0;
	const children = await transaction
		.select({ originalOperationId: providerOperation.originalOperationId })
		.from(providerOperation)
		.where(
			and(
				inArray(
					providerOperation.originalOperationId,
					bets.map((bet) => bet.id),
				),
				eq(providerOperation.type, "win"),
			),
		);
	const settledIds = new Set(
		children.flatMap((row) =>
			row.originalOperationId ? [row.originalOperationId] : [],
		),
	);
	return bets.filter(
		(bet) =>
			bet.refundedCashMinor + bet.refundedBonusMinor < bet.amountMinor &&
			!settledIds.has(bet.id),
	).length;
}
