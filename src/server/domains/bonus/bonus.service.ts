import "@tanstack/react-start/server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import {
	calculateRequiredWager,
	determineActiveAwardOutcome,
} from "#/server/domains/bonus/bonus.policy";
import {
	type CreateBonusDefinitionCommand,
	type CreateBonusDefinitionInput,
	createBonusDefinitionSchema,
} from "#/server/domains/bonus/bonus.schema";
import { countUnsettledAwardBets } from "#/server/domains/gameplay/gameplay.settlement";
import { applyWalletOperationInTransaction } from "#/server/domains/wallet/wallet.service";
import { db } from "#/server/infra/db";
import type { DatabaseTransaction } from "#/server/infra/db/database.types";
import {
	bonusAward,
	bonusDefinition,
	ledgerEntry,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

export type { CreateBonusDefinitionInput } from "#/server/domains/bonus/bonus.schema";

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
	const values = parseBonusDefinition(input);
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

export async function listActiveBonusDefinitions() {
	return db
		.select({
			id: bonusDefinition.id,
			code: bonusDefinition.code,
			name: bonusDefinition.name,
			thumbnailUrl: bonusDefinition.thumbnailUrl,
			amountMinor: bonusDefinition.amountMinor,
			matchPercentageBps: bonusDefinition.matchPercentageBps,
			type: bonusDefinition.type,
		})
		.from(bonusDefinition)
		.where(eq(bonusDefinition.isActive, true))
		.orderBy(asc(bonusDefinition.name));
}

export async function getPlayerBonusOverview(
	playerId: string,
	now = new Date(),
) {
	const [active] = await db
		.select({ id: bonusAward.id, expiresAt: bonusAward.expiresAt })
		.from(bonusAward)
		.where(
			and(eq(bonusAward.playerId, playerId), eq(bonusAward.status, "active")),
		);
	if (active && active.expiresAt <= now) {
		try {
			await settleBonusAward({ awardId: active.id, reason: "expire", now });
		} catch (error) {
			if (
				!(error instanceof BonusServiceError) ||
				error.code !== "INVALID_TRANSITION"
			) {
				throw error;
			}
		}
	}

	const [definitions, awards] = await Promise.all([
		db.select().from(bonusDefinition).where(eq(bonusDefinition.isActive, true)),
		db
			.select({ award: bonusAward, definition: bonusDefinition })
			.from(bonusAward)
			.innerJoin(
				bonusDefinition,
				eq(bonusAward.definitionId, bonusDefinition.id),
			)
			.where(eq(bonusAward.playerId, playerId))
			.orderBy(desc(bonusAward.activatedAt)),
	]);
	const claimedDefinitionIds = new Set(
		awards.map(({ award }) => award.definitionId),
	);
	const latestAwards = new Map<string, (typeof awards)[number]["award"]>();
	for (const { award } of awards) {
		if (!latestAwards.has(award.definitionId)) {
			latestAwards.set(award.definitionId, award);
		}
	}
	const current = awards.find(({ award }) => award.status === "active") ?? null;
	return {
		definitions: definitions.map((definition) => ({
			...definition,
			claimed: claimedDefinitionIds.has(definition.id),
			latestAward: latestAwards.get(definition.id) ?? null,
		})),
		activeAward: current,
	};
}

export async function activateBonusAward(input: {
	playerId: string;
	definitionId: string;
	idempotencyKey: string;
	qualifyingDepositOperationId?: string;
	now?: Date;
}) {
	return db.transaction((transaction) =>
		activateBonusAwardInTransaction(transaction, input),
	);
}

export async function activateBonusAwardInTransaction(
	transaction: DatabaseTransaction,
	input: {
		playerId: string;
		definitionId: string;
		idempotencyKey: string;
		qualifyingDepositOperationId?: string;
		actorUserId?: string;
		now?: Date;
	},
) {
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

	const qualifyingDeposit = await resolveQualifyingDeposit(
		transaction,
		definition,
		input,
	);

	const now = input.now ?? new Date();
	const calculatedAmountMinor = definition.matchPercentageBps
		? Math.floor(
				((qualifyingDeposit?.amountMinor ?? 0) *
					definition.matchPercentageBps) /
					10_000,
			)
		: definition.amountMinor;
	const amountMinor = Math.min(
		calculatedAmountMinor,
		definition.maximumAwardMinor ?? calculatedAmountMinor,
	);
	if (amountMinor <= 0) {
		throw new BonusServiceError(
			"Qualifying top-up does not produce a bonus award",
			"DEPOSIT_NOT_ELIGIBLE",
		);
	}
	const expiresAt = new Date(now);
	expiresAt.setUTCDate(expiresAt.getUTCDate() + definition.expiresAfterDays);

	const [award] = await transaction
		.insert(bonusAward)
		.values({
			definitionId: definition.id,
			playerId: input.playerId,
			qualifyingDepositOperationId: qualifyingDeposit?.operationId,
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
		throw new BonusServiceError("Bonus award was not created", "INVALID_BONUS");
	}

	await applyWalletOperationInTransaction(transaction, {
		playerId: input.playerId,
		type: "bonus_credit",
		idempotencyKey: `bonus-award:${award.id}:credit`,
		movements: [{ bucket: "bonus", amountMinor }],
		sourceType: "bonus_award",
		sourceId: award.id,
		actorUserId: input.actorUserId,
	});

	return { award, isDuplicate: false };
}

export async function settleBonusAward(input: {
	awardId: string;
	reason: "evaluate" | "expire" | "cancel";
	now?: Date;
}) {
	return db.transaction(async (transaction) => {
		const [awardIdentity] = await transaction
			.select({ playerId: bonusAward.playerId })
			.from(bonusAward)
			.where(eq(bonusAward.id, input.awardId));
		if (!awardIdentity) {
			throw new BonusServiceError(
				"Bonus award was not found",
				"BONUS_NOT_FOUND",
			);
		}
		await transaction
			.select({ id: wallet.id })
			.from(wallet)
			.where(eq(wallet.playerId, awardIdentity.playerId))
			.for("update");
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
	if (input.reason === "cancel" && (input.unsettledOperationCount ?? 0) > 0) {
		throw new BonusServiceError(
			"Bonus cannot be cancelled while gameplay is unsettled",
			"INVALID_TRANSITION",
		);
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

async function resolveQualifyingDeposit(
	transaction: DatabaseTransaction,
	definition: typeof bonusDefinition.$inferSelect,
	input: {
		playerId: string;
		qualifyingDepositOperationId?: string;
	},
) {
	if (definition.type !== "deposit") return null;
	const deposits = await transaction
		.select({
			operation: walletOperation,
			walletPlayerId: wallet.playerId,
			amountMinor: ledgerEntry.amountMinor,
		})
		.from(walletOperation)
		.innerJoin(wallet, eq(walletOperation.walletId, wallet.id))
		.innerJoin(ledgerEntry, eq(ledgerEntry.operationId, walletOperation.id))
		.leftJoin(
			bonusAward,
			eq(bonusAward.qualifyingDepositOperationId, walletOperation.id),
		)
		.where(
			and(
				eq(walletOperation.type, "demo_top_up"),
				eq(wallet.playerId, input.playerId),
				isNull(bonusAward.id),
				...(input.qualifyingDepositOperationId
					? [eq(walletOperation.id, input.qualifyingDepositOperationId)]
					: []),
			),
		)
		.orderBy(desc(walletOperation.createdAt));
	const deposit = deposits.find(
		(candidate) =>
			candidate.amountMinor >= (definition.minimumDepositMinor ?? 0),
	);
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
	return {
		operationId: deposit.operation.id,
		amountMinor: deposit.amountMinor,
	};
}

function parseBonusDefinition(
	input: CreateBonusDefinitionInput,
): CreateBonusDefinitionCommand {
	const result = createBonusDefinitionSchema.safeParse(input);
	if (!result.success) {
		throw new BonusServiceError(
			result.error.issues[0]?.message ?? "Bonus definition is invalid",
			"INVALID_BONUS",
		);
	}
	return result.data;
}
