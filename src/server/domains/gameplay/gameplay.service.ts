import "@tanstack/react-start/server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import { isGameEligible } from "#/server/domains/bonus/bonus.policy";
import { settleBonusAwardInTransaction } from "#/server/domains/bonus/bonus.service";
import {
	calculateAwardWageringProgress,
	countUnsettledAwardBets,
} from "#/server/domains/gameplay/gameplay.settlement";
import {
	allocateRefund,
	allocateStake,
	allocateWin,
	assertMinorUnits,
	assertPositiveMinorUnits,
	playableBalance,
	type WalletBalances,
} from "#/server/domains/wallet/wallet.policy";
import {
	applyWalletOperationInTransaction,
	type DatabaseTransaction,
	type WalletMovement,
} from "#/server/domains/wallet/wallet.service";
import { db } from "#/server/infra/db";
import {
	bonusAward,
	gameRound,
	gameSession,
	providerOperation,
	user,
	wallet,
} from "#/server/infra/db/schema";

type GameplayIdentity = {
	integrationProvider: string;
	playerId: string;
	externalTransactionId: string;
	externalSessionId: string;
	externalRoundId: string;
	gameId: string;
	now?: Date;
};

export type RecordBetInput = GameplayIdentity & {
	amountMinor: number;
	gameCategory?: string;
	contentProvider?: string;
};

export type RecordWinInput = GameplayIdentity & {
	betAmountMinor: number;
	winAmountMinor: number;
};

export type RecordRefundInput = GameplayIdentity & {
	amountMinor: number;
};

export class GameplayServiceError extends Error {
	constructor(
		message: string,
		readonly code:
			| "INVALID_USER"
			| "NO_BALANCE"
			| "DOUBLED_BET"
			| "NO_AMOUNT"
			| "INVALID_TRANSACTION"
			| "IDEMPOTENCY_CONFLICT",
	) {
		super(message);
		this.name = "GameplayServiceError";
	}
}

export async function recordBet(input: RecordBetInput) {
	assertPositiveMinorUnits(input.amountMinor, "Bet");
	return db.transaction(async (transaction) => {
		let currentWallet = await lockWallet(transaction, input.playerId);
		const fingerprint = callbackFingerprint("bet", input);
		const duplicate = await findExistingOperation(
			transaction,
			"bet",
			input,
			fingerprint,
		);
		if (duplicate) return duplicate;

		const context = await ensureGameplayContext(
			transaction,
			input,
			currentWallet.currencyCode,
		);
		let award: typeof bonusAward.$inferSelect | undefined =
			await lockActiveAward(transaction, input.playerId);
		let isBonusEligible = false;
		if (award) {
			const now = input.now ?? new Date();
			if (now >= award.expiresAt) {
				const unsettled = await countUnsettledAwardBets(transaction, award.id);
				if (unsettled === 0) {
					await settleBonusAwardInTransaction(transaction, {
						awardId: award.id,
						reason: "expire",
						unsettledOperationCount: 0,
						now,
					});
					award = undefined;
					currentWallet = await lockWallet(transaction, input.playerId);
				}
			} else {
				isBonusEligible = isGameEligible({
					gameId: input.gameId,
					category: input.gameCategory,
					provider: input.contentProvider,
					eligibleGameIds: award.eligibleGameIds,
					eligibleCategories: award.eligibleCategories,
					eligibleProviders: award.eligibleProviders,
				});
			}
		}

		let allocation: ReturnType<typeof allocateStake>;
		try {
			allocation = allocateStake({
				stakeMinor: input.amountMinor,
				balances: walletBalances(currentWallet),
				isBonusEligible,
			});
		} catch (error) {
			throw new GameplayServiceError(
				error instanceof Error ? error.message : "Insufficient balance",
				"NO_BALANCE",
			);
		}

		const operationId = crypto.randomUUID();
		const movements = compactMovements([
			{ bucket: "bonus", amountMinor: -allocation.bonusStakeMinor },
			{ bucket: "cash", amountMinor: -allocation.cashStakeMinor },
		]);
		const walletResult = await applyWalletOperationInTransaction(transaction, {
			playerId: input.playerId,
			type: "bet",
			idempotencyKey: gameplayWalletKey(input, "bet"),
			movements,
			sourceType: "provider_operation",
			sourceId: operationId,
		});

		if (award && allocation.bonusStakeMinor > 0) {
			await transaction
				.update(bonusAward)
				.set({
					bonusBalanceMinor: walletResult.balances.bonusBalanceMinor,
				})
				.where(eq(bonusAward.id, award.id));
		}

		const response = responseFor(walletResult.balances);
		await insertProviderOperation(transaction, {
			id: operationId,
			roundId: context.round.id,
			input,
			type: "bet",
			fingerprint,
			amountMinor: input.amountMinor,
			cashAmountMinor: allocation.cashStakeMinor,
			bonusAmountMinor: allocation.bonusStakeMinor,
			wageringContributionMinor: allocation.wageringContributionMinor,
			bonusAwardId: allocation.bonusStakeMinor > 0 ? award?.id : undefined,
			walletOperationId: walletResult.operationId,
			response,
		});
		if (award && allocation.bonusStakeMinor > 0) {
			await updateAwardWageringProgress(transaction, award);
		}
		return { operationId, isDuplicate: false, ...response };
	});
}

export async function recordWin(input: RecordWinInput) {
	assertPositiveMinorUnits(input.betAmountMinor, "Reported bet");
	assertMinorUnits(input.winAmountMinor, "Win");
	return db.transaction(async (transaction) => {
		const currentWallet = await lockWallet(transaction, input.playerId);
		const fingerprint = callbackFingerprint("win", input);
		const duplicate = await findExistingOperation(
			transaction,
			"win",
			input,
			fingerprint,
		);
		if (duplicate) return duplicate;

		const context = await ensureGameplayContext(
			transaction,
			input,
			currentWallet.currencyCode,
		);
		const original = await findBetForWin(
			transaction,
			context.round.id,
			input.betAmountMinor,
		);
		const award = original.bonusAwardId
			? await lockAward(transaction, original.bonusAwardId)
			: undefined;
		const allocation = allocateWin({
			winMinor: input.winAmountMinor,
			cashStakeMinor: original.cashAmountMinor,
			bonusStakeMinor: original.bonusAmountMinor,
		});
		const operationId = crypto.randomUUID();
		const movements = compactMovements([
			{
				bucket: "cash",
				amountMinor:
					allocation.cashWinMinor +
					(award?.status === "completed" ? allocation.bonusWinMinor : 0),
			},
			{
				bucket: "bonus",
				amountMinor: award?.status === "active" ? allocation.bonusWinMinor : 0,
			},
		]);
		const walletResult =
			movements.length > 0
				? await applyWalletOperationInTransaction(transaction, {
						playerId: input.playerId,
						type: "win",
						idempotencyKey: gameplayWalletKey(input, "win"),
						movements,
						sourceType: "provider_operation",
						sourceId: operationId,
					})
				: { operationId: undefined, balances: walletBalances(currentWallet) };

		if (award?.status === "active" && allocation.bonusWinMinor > 0) {
			await transaction
				.update(bonusAward)
				.set({ bonusBalanceMinor: walletResult.balances.bonusBalanceMinor })
				.where(eq(bonusAward.id, award.id));
		}

		await insertProviderOperation(transaction, {
			id: operationId,
			roundId: context.round.id,
			input,
			type: "win",
			fingerprint,
			amountMinor: input.winAmountMinor,
			reportedBetAmountMinor: input.betAmountMinor,
			cashAmountMinor: allocation.cashWinMinor,
			bonusAmountMinor: allocation.bonusWinMinor,
			bonusAwardId: original.bonusAwardId ?? undefined,
			originalOperationId: original.id,
			walletOperationId: walletResult.operationId,
			response: {},
		});

		const finalBalances = await finalizeAwardAfterOperation(
			transaction,
			original.bonusAwardId,
			input.now ?? new Date(),
			walletResult.balances,
		);
		const response = responseFor(finalBalances);
		await transaction
			.update(providerOperation)
			.set({ response })
			.where(eq(providerOperation.id, operationId));
		await markRoundSettled(
			transaction,
			context.round.id,
			input.now ?? new Date(),
		);
		return { operationId, isDuplicate: false, ...response };
	});
}

export async function recordRefund(input: RecordRefundInput) {
	assertPositiveMinorUnits(input.amountMinor, "Refund");
	return db.transaction(async (transaction) => {
		const currentWallet = await lockWallet(transaction, input.playerId);
		const fingerprint = callbackFingerprint("refund", input);
		const duplicate = await findExistingOperation(
			transaction,
			"refund",
			input,
			fingerprint,
		);
		if (duplicate) return duplicate;

		const context = await ensureGameplayContext(
			transaction,
			input,
			currentWallet.currencyCode,
		);
		const original = await findRefundOriginal(
			transaction,
			context.round.id,
			input.amountMinor,
		);
		const allocation = allocateRefund({
			refundMinor: input.amountMinor,
			refundableCashMinor:
				original.cashAmountMinor - original.refundedCashMinor,
			refundableBonusMinor:
				original.bonusAmountMinor - original.refundedBonusMinor,
		});
		const award = original.bonusAwardId
			? await lockAward(transaction, original.bonusAwardId)
			: undefined;
		const movements = refundMovements(original.type, allocation, award?.status);
		const operationId = crypto.randomUUID();
		let walletResult = {
			operationId: undefined as string | undefined,
			balances: walletBalances(currentWallet),
		};
		if (movements.length > 0) {
			try {
				walletResult = await applyWalletOperationInTransaction(transaction, {
					playerId: input.playerId,
					type: "refund",
					idempotencyKey: gameplayWalletKey(input, "refund"),
					movements,
					sourceType: "provider_operation",
					sourceId: operationId,
				});
			} catch (error) {
				throw new GameplayServiceError(
					error instanceof Error ? error.message : "Refund cannot be applied",
					"NO_BALANCE",
				);
			}
		}

		if (award?.status === "active" && allocation.bonusRefundMinor > 0) {
			await transaction
				.update(bonusAward)
				.set({
					bonusBalanceMinor: walletResult.balances.bonusBalanceMinor,
				})
				.where(eq(bonusAward.id, award.id));
		}

		const refundedCashMinor =
			original.refundedCashMinor + allocation.cashRefundMinor;
		const refundedBonusMinor =
			original.refundedBonusMinor + allocation.bonusRefundMinor;
		const originalStatus =
			refundedCashMinor + refundedBonusMinor === original.amountMinor
				? "refunded"
				: "partially_refunded";
		await transaction
			.update(providerOperation)
			.set({ refundedCashMinor, refundedBonusMinor, status: originalStatus })
			.where(eq(providerOperation.id, original.id));
		if (award?.status === "active" && allocation.bonusRefundMinor > 0) {
			await updateAwardWageringProgress(transaction, award);
		}

		await insertProviderOperation(transaction, {
			id: operationId,
			roundId: context.round.id,
			input,
			type: "refund",
			fingerprint,
			amountMinor: input.amountMinor,
			cashAmountMinor: allocation.cashRefundMinor,
			bonusAmountMinor: allocation.bonusRefundMinor,
			bonusAwardId: original.bonusAwardId ?? undefined,
			originalOperationId: original.id,
			walletOperationId: walletResult.operationId,
			response: {},
		});
		const finalBalances = await finalizeAwardAfterOperation(
			transaction,
			original.bonusAwardId,
			input.now ?? new Date(),
			walletResult.balances,
		);
		const response = responseFor(finalBalances);
		await transaction
			.update(providerOperation)
			.set({ response })
			.where(eq(providerOperation.id, operationId));
		await markRoundResolved(
			transaction,
			context.round.id,
			input.now ?? new Date(),
		);
		return { operationId, isDuplicate: false, ...response };
	});
}

async function lockWallet(transaction: DatabaseTransaction, playerId: string) {
	const [current] = await transaction
		.select({ wallet, banned: user.banned })
		.from(wallet)
		.innerJoin(user, eq(user.id, wallet.playerId))
		.where(eq(wallet.playerId, playerId))
		.for("update", { of: wallet });
	if (!current || current.banned)
		throw new GameplayServiceError(
			"Active player wallet was not found",
			"INVALID_USER",
		);
	return current.wallet;
}

async function lockActiveAward(
	transaction: DatabaseTransaction,
	playerId: string,
) {
	const [award] = await transaction
		.select()
		.from(bonusAward)
		.where(
			and(eq(bonusAward.playerId, playerId), eq(bonusAward.status, "active")),
		)
		.for("update");
	return award;
}

async function lockAward(transaction: DatabaseTransaction, awardId: string) {
	const [award] = await transaction
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, awardId))
		.for("update");
	return award;
}

async function ensureGameplayContext(
	transaction: DatabaseTransaction,
	input: GameplayIdentity,
	currencyCode: string,
) {
	let [session] = await transaction
		.select()
		.from(gameSession)
		.where(
			and(
				eq(gameSession.integrationProvider, input.integrationProvider),
				eq(gameSession.playerId, input.playerId),
				eq(gameSession.externalSessionId, input.externalSessionId),
			),
		);
	if (session && session.gameId !== input.gameId)
		invalidTransaction("Session game does not match");
	if (!session) {
		[session] = await transaction
			.insert(gameSession)
			.values({
				playerId: input.playerId,
				integrationProvider: input.integrationProvider,
				externalSessionId: input.externalSessionId,
				gameId: input.gameId,
				currencyCode,
			})
			.returning();
	}
	if (!session) invalidTransaction("Game session could not be recorded");

	let [round] = await transaction
		.select()
		.from(gameRound)
		.where(
			and(
				eq(gameRound.sessionId, session.id),
				eq(gameRound.externalRoundId, input.externalRoundId),
				eq(gameRound.gameId, input.gameId),
			),
		);
	if (!round) {
		[round] = await transaction
			.insert(gameRound)
			.values({
				sessionId: session.id,
				playerId: input.playerId,
				integrationProvider: input.integrationProvider,
				externalRoundId: input.externalRoundId,
				gameId: input.gameId,
			})
			.returning();
	}
	if (!round) invalidTransaction("Game round could not be recorded");
	return { session, round };
}

async function findExistingOperation(
	transaction: DatabaseTransaction,
	type: "bet" | "win" | "refund",
	input: GameplayIdentity,
	fingerprint: string,
) {
	const [existing] = await transaction
		.select()
		.from(providerOperation)
		.where(
			and(
				eq(providerOperation.integrationProvider, input.integrationProvider),
				eq(providerOperation.type, type),
				eq(
					providerOperation.externalTransactionId,
					input.externalTransactionId,
				),
			),
		);
	if (!existing) return undefined;
	if (existing.fingerprint !== fingerprint) {
		throw new GameplayServiceError(
			"Provider transaction key has a conflicting payload",
			"IDEMPOTENCY_CONFLICT",
		);
	}
	return {
		operationId: existing.id,
		isDuplicate: true,
		...(existing.response as ReturnType<typeof responseFor>),
	};
}

async function findBetForWin(
	transaction: DatabaseTransaction,
	roundId: string,
	betAmountMinor: number,
) {
	const bets = await transaction
		.select()
		.from(providerOperation)
		.where(
			and(
				eq(providerOperation.roundId, roundId),
				eq(providerOperation.type, "bet"),
				eq(providerOperation.amountMinor, betAmountMinor),
			),
		);
	const children = await childOperationIds(
		transaction,
		bets.map((bet) => bet.id),
	);
	const candidates = bets.filter(
		(bet) =>
			bet.refundedCashMinor === 0 &&
			bet.refundedBonusMinor === 0 &&
			!children.has(bet.id),
	);
	if (candidates.length !== 1)
		invalidTransaction("Win has no unambiguous original bet");
	return candidates[0];
}

async function findRefundOriginal(
	transaction: DatabaseTransaction,
	roundId: string,
	amountMinor: number,
) {
	for (const type of ["win", "bet"] as const) {
		const operations = await transaction
			.select()
			.from(providerOperation)
			.where(
				and(
					eq(providerOperation.roundId, roundId),
					eq(providerOperation.type, type),
				),
			);
		const candidates = operations.filter(
			(operation) =>
				operation.amountMinor -
					operation.refundedCashMinor -
					operation.refundedBonusMinor >=
				amountMinor,
		);
		if (candidates.length > 1)
			invalidTransaction("Refund original is ambiguous");
		if (candidates.length === 1) return candidates[0];
	}
	invalidTransaction("Refund has no compatible original operation");
}

async function childOperationIds(
	transaction: DatabaseTransaction,
	originalIds: string[],
) {
	if (originalIds.length === 0) return new Set<string>();
	const rows = await transaction
		.select({ originalOperationId: providerOperation.originalOperationId })
		.from(providerOperation)
		.where(
			and(
				inArray(providerOperation.originalOperationId, originalIds),
				eq(providerOperation.type, "win"),
			),
		);
	return new Set(
		rows.flatMap((row) =>
			row.originalOperationId ? [row.originalOperationId] : [],
		),
	);
}

async function finalizeAwardAfterOperation(
	transaction: DatabaseTransaction,
	awardId: string | null,
	now: Date,
	fallback: WalletBalances,
) {
	if (!awardId) return fallback;
	const unsettledOperationCount = await countUnsettledAwardBets(
		transaction,
		awardId,
	);
	if (unsettledOperationCount > 0) return fallback;
	const award = await lockAward(transaction, awardId);
	if (!award || award.status !== "active") return fallback;
	const result = await settleBonusAwardInTransaction(transaction, {
		awardId,
		reason: now >= award.expiresAt ? "expire" : "evaluate",
		unsettledOperationCount,
		now,
	});
	if (result.award.status === "active") return fallback;
	const finalWallet = await lockWallet(transaction, award.playerId);
	return walletBalances(finalWallet);
}

async function markRoundSettled(
	transaction: DatabaseTransaction,
	roundId: string,
	now: Date,
) {
	const bets = await transaction
		.select()
		.from(providerOperation)
		.where(
			and(
				eq(providerOperation.roundId, roundId),
				eq(providerOperation.type, "bet"),
			),
		);
	const children = await childOperationIds(
		transaction,
		bets.map((bet) => bet.id),
	);
	if (
		bets.length > 0 &&
		bets.every(
			(bet) =>
				children.has(bet.id) ||
				bet.refundedCashMinor + bet.refundedBonusMinor === bet.amountMinor,
		)
	) {
		await transaction
			.update(gameRound)
			.set({ status: "settled", settledAt: now })
			.where(eq(gameRound.id, roundId));
	}
}

async function markRoundResolved(
	transaction: DatabaseTransaction,
	roundId: string,
	now: Date,
) {
	const bets = await transaction
		.select()
		.from(providerOperation)
		.where(
			and(
				eq(providerOperation.roundId, roundId),
				eq(providerOperation.type, "bet"),
			),
		);
	if (bets.length === 0) return;
	const wins = await childOperationIds(
		transaction,
		bets.map((bet) => bet.id),
	);
	const fullyRefunded = bets.every(
		(bet) => bet.refundedCashMinor + bet.refundedBonusMinor === bet.amountMinor,
	);
	const resolved = bets.every(
		(bet) =>
			wins.has(bet.id) ||
			bet.refundedCashMinor + bet.refundedBonusMinor === bet.amountMinor,
	);
	if (!resolved) return;
	await transaction
		.update(gameRound)
		.set({
			status: fullyRefunded && wins.size === 0 ? "refunded" : "settled",
			settledAt: now,
		})
		.where(eq(gameRound.id, roundId));
}

async function updateAwardWageringProgress(
	transaction: DatabaseTransaction,
	award: typeof bonusAward.$inferSelect,
) {
	const completedWagerMinor = await calculateAwardWageringProgress(
		transaction,
		award.id,
		award.requiredWagerMinor,
	);
	await transaction
		.update(bonusAward)
		.set({ completedWagerMinor })
		.where(eq(bonusAward.id, award.id));
}

function refundMovements(
	originalType: "bet" | "win" | "refund",
	allocation: { cashRefundMinor: number; bonusRefundMinor: number },
	awardStatus?: (typeof bonusAward.status.enumValues)[number],
) {
	if (originalType === "refund")
		invalidTransaction("A refund cannot refund another refund");
	const direction = originalType === "bet" ? 1 : -1;
	let cashAmount = allocation.cashRefundMinor * direction;
	let bonusAmount = allocation.bonusRefundMinor * direction;
	if (awardStatus === "completed") {
		cashAmount += bonusAmount;
		bonusAmount = 0;
	} else if (
		awardStatus === "expired" ||
		awardStatus === "cancelled" ||
		awardStatus === "exhausted"
	) {
		bonusAmount = 0;
	}
	return compactMovements([
		{ bucket: "cash", amountMinor: cashAmount },
		{ bucket: "bonus", amountMinor: bonusAmount },
	]);
}

function compactMovements(movements: WalletMovement[]) {
	return movements.filter((movement) => movement.amountMinor !== 0);
}

function walletBalances(
	current: Pick<
		typeof wallet.$inferSelect,
		"cashBalanceMinor" | "bonusBalanceMinor" | "reservedCashMinor"
	>,
): WalletBalances {
	return {
		cashBalanceMinor: current.cashBalanceMinor,
		bonusBalanceMinor: current.bonusBalanceMinor,
		reservedCashMinor: current.reservedCashMinor,
	};
}

function responseFor(balances: WalletBalances) {
	return { balances, balanceMinor: playableBalance(balances) };
}

function callbackFingerprint(
	type: "bet" | "win" | "refund",
	input: GameplayIdentity & Record<string, unknown>,
) {
	const identity = {
		integrationProvider: input.integrationProvider,
		playerId: input.playerId,
		externalTransactionId: input.externalTransactionId,
		externalSessionId: input.externalSessionId,
		externalRoundId: input.externalRoundId,
		gameId: input.gameId,
	};
	const payload =
		type === "win"
			? {
					...identity,
					betAmountMinor: input.betAmountMinor,
					winAmountMinor: input.winAmountMinor,
				}
			: { ...identity, amountMinor: input.amountMinor };
	return createHash("sha256")
		.update(JSON.stringify({ type, ...payload }))
		.digest("hex");
}

function gameplayWalletKey(input: GameplayIdentity, type: string) {
	return `gameplay:${input.integrationProvider}:${type}:${input.externalTransactionId}`;
}

async function insertProviderOperation(
	transaction: DatabaseTransaction,
	input: {
		id: string;
		roundId: string;
		input: GameplayIdentity;
		type: "bet" | "win" | "refund";
		fingerprint: string;
		amountMinor: number;
		reportedBetAmountMinor?: number;
		cashAmountMinor: number;
		bonusAmountMinor: number;
		wageringContributionMinor?: number;
		bonusAwardId?: string;
		originalOperationId?: string;
		walletOperationId?: string;
		response: Record<string, unknown>;
	},
) {
	await transaction.insert(providerOperation).values({
		id: input.id,
		roundId: input.roundId,
		playerId: input.input.playerId,
		integrationProvider: input.input.integrationProvider,
		type: input.type,
		externalTransactionId: input.input.externalTransactionId,
		fingerprint: input.fingerprint,
		amountMinor: input.amountMinor,
		reportedBetAmountMinor: input.reportedBetAmountMinor,
		cashAmountMinor: input.cashAmountMinor,
		bonusAmountMinor: input.bonusAmountMinor,
		wageringContributionMinor: input.wageringContributionMinor ?? 0,
		bonusAwardId: input.bonusAwardId,
		originalOperationId: input.originalOperationId,
		walletOperationId: input.walletOperationId,
		response: input.response,
	});
}

function invalidTransaction(message: string): never {
	throw new GameplayServiceError(message, "INVALID_TRANSACTION");
}
