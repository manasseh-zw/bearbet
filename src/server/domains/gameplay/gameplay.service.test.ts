import assert from "node:assert/strict";
import test, { after, type TestContext } from "node:test";

import { eq, inArray } from "drizzle-orm";
import {
	activateBonusAward,
	createBonusDefinition,
	settleBonusAward,
} from "#/server/domains/bonus/bonus.service";
import { db, pool } from "#/server/infra/db";
import {
	bonusAward,
	bonusDefinition,
	gameRound,
	gameSession,
	ledgerEntry,
	player,
	providerOperation,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

import {
	GameplayServiceError,
	getPlayableWalletBalance,
	recordBet,
	recordRefund,
	recordWin,
} from "./gameplay.service";
import { simulateGameRound } from "./gameplay.simulator";

after(async () => {
	await pool.end();
});

test("mixed bonus gameplay completes once and a later win refund debits converted cash", async (context) => {
	const playerId = await createTestPlayer(context, 100_000);
	const definition = await createTestBonus(context, {
		playerId,
		amountMinor: 10_000,
		wageringMultiplier: 1,
		eligibleCategories: ["slots"],
	});
	const activated = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:award`,
		now: new Date("2030-01-01T00:00:00Z"),
	});
	const identity = {
		integrationProvider: "fixture",
		playerId,
		externalTransactionId: "shared-transaction",
		externalSessionId: "session-1",
		externalRoundId: "round-1",
		gameId: "slot-1",
		now: new Date("2030-01-01T01:00:00Z"),
	};

	const betInput = {
		...identity,
		amountMinor: 12_000,
		gameCategory: "slots",
	};
	const concurrentBets = await Promise.all([
		recordBet(betInput),
		recordBet(betInput),
	]);
	const bet = concurrentBets.find((result) => !result.isDuplicate);
	assert.ok(bet);
	assert.equal(concurrentBets.filter((result) => result.isDuplicate).length, 1);
	assert.deepEqual(bet.balances, {
		cashBalanceMinor: 98_000,
		bonusBalanceMinor: 0,
		reservedCashMinor: 0,
	});
	const [storedBet] = await db
		.select()
		.from(providerOperation)
		.where(eq(providerOperation.id, bet.operationId));
	assert.equal(storedBet?.cashAmountMinor, 2_000);
	assert.equal(storedBet?.bonusAmountMinor, 10_000);
	assert.equal(storedBet?.wageringContributionMinor, 10_000);
	const premature = await settleBonusAward({
		awardId: activated.award.id,
		reason: "evaluate",
		now: new Date("2030-01-01T01:30:00Z"),
	});
	assert.equal(premature.award.status, "active");

	const retry = await recordBet(betInput);
	assert.equal(retry.isDuplicate, true);
	assert.equal(retry.operationId, bet.operationId);
	await assert.rejects(
		recordBet({
			...identity,
			amountMinor: 13_000,
			gameCategory: "slots",
		}),
		(error) =>
			error instanceof GameplayServiceError &&
			error.code === "IDEMPOTENCY_CONFLICT",
	);

	const win = await recordWin({
		...identity,
		betAmountMinor: 12_000,
		winAmountMinor: 25_000,
	});
	assert.equal(win.balanceMinor, 123_000);
	assert.deepEqual(win.balances, {
		cashBalanceMinor: 123_000,
		bonusBalanceMinor: 0,
		reservedCashMinor: 0,
	});
	const [completed] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, activated.award.id));
	assert.equal(completed?.status, "completed");
	assert.equal(completed?.completedWagerMinor, 10_000);

	const winRetry = await recordWin({
		...identity,
		betAmountMinor: 12_000,
		winAmountMinor: 25_000,
	});
	assert.equal(winRetry.isDuplicate, true);
	assert.equal(winRetry.balanceMinor, 123_000);

	const refund = await recordRefund({
		...identity,
		amountMinor: 25_000,
	});
	assert.equal(refund.balanceMinor, 98_000);
	const refundRetry = await recordRefund({ ...identity, amountMinor: 25_000 });
	assert.equal(refundRetry.isDuplicate, true);
	const [stillCompleted] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, activated.award.id));
	assert.equal(stillCompleted?.status, "completed");
	assert.equal(stillCompleted?.completedWagerMinor, 10_000);
});

test("excluded bets use cash and bonus bet refunds restore progress exactly", async (context) => {
	const playerId = await createTestPlayer(context, 50_000);
	const definition = await createTestBonus(context, {
		playerId,
		amountMinor: 10_000,
		wageringMultiplier: 5,
		eligibleCategories: ["slots"],
	});
	const activated = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:award`,
	});

	const excluded = await recordBet({
		...gameIdentity(playerId, "excluded-bet", "round-cash"),
		amountMinor: 5_000,
		gameCategory: "roulette",
	});
	assert.equal(excluded.balances.cashBalanceMinor, 45_000);
	assert.equal(excluded.balances.bonusBalanceMinor, 10_000);
	await recordRefund({
		...gameIdentity(playerId, "excluded-refund", "round-cash"),
		amountMinor: 5_000,
	});

	const eligible = await recordBet({
		...gameIdentity(playerId, "bonus-bet", "round-bonus"),
		amountMinor: 7_000,
		gameCategory: "slots",
	});
	assert.equal(eligible.balances.bonusBalanceMinor, 3_000);
	await recordRefund({
		...gameIdentity(playerId, "partial-refund", "round-bonus"),
		amountMinor: 2_000,
	});
	let [award] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, activated.award.id));
	assert.equal(award?.bonusBalanceMinor, 5_000);
	assert.equal(award?.completedWagerMinor, 5_000);

	await recordRefund({
		...gameIdentity(playerId, "final-refund", "round-bonus"),
		amountMinor: 5_000,
	});
	[award] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, activated.award.id));
	assert.equal(award?.bonusBalanceMinor, 10_000);
	assert.equal(award?.completedWagerMinor, 0);
	await assert.rejects(
		recordRefund({
			...gameIdentity(playerId, "over-refund", "round-bonus"),
			amountMinor: 1,
		}),
		(error) =>
			error instanceof GameplayServiceError &&
			error.code === "INVALID_TRANSACTION",
	);
});

test("orphan and ambiguous settlements are rejected without moving funds", async (context) => {
	const playerId = await createTestPlayer(context, 20_000);
	await assert.rejects(
		recordWin({
			...gameIdentity(playerId, "orphan-win", "orphan-round"),
			betAmountMinor: 1_000,
			winAmountMinor: 2_000,
		}),
		(error) =>
			error instanceof GameplayServiceError &&
			error.code === "INVALID_TRANSACTION",
	);

	await recordBet({
		...gameIdentity(playerId, "bet-a", "ambiguous-round"),
		amountMinor: 1_000,
	});
	await recordBet({
		...gameIdentity(playerId, "bet-b", "ambiguous-round"),
		amountMinor: 1_000,
	});
	await assert.rejects(
		recordWin({
			...gameIdentity(playerId, "ambiguous-win", "ambiguous-round"),
			betAmountMinor: 1_000,
			winAmountMinor: 2_000,
		}),
		(error) =>
			error instanceof GameplayServiceError &&
			error.code === "INVALID_TRANSACTION",
	);
	const balance = await getPlayableWalletBalance(playerId);
	assert.equal(balance.balanceMinor, 18_000);
	const [failedWin] = await db
		.select()
		.from(providerOperation)
		.where(eq(providerOperation.externalTransactionId, "ambiguous-win"));
	assert.equal(failedWin, undefined);
});

test("an expired award blocks new bonus stakes until its last bet settles", async (context) => {
	const playerId = await createTestPlayer(context, 20_000);
	const definition = await createTestBonus(context, {
		playerId,
		amountMinor: 10_000,
		wageringMultiplier: 5,
		eligibleCategories: ["slots"],
		expiresAfterDays: 1,
	});
	const activated = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:award`,
		now: new Date("2030-04-01T00:00:00Z"),
	});
	await recordBet({
		...gameIdentity(playerId, "pre-expiry-bet", "expiry-round"),
		amountMinor: 4_000,
		gameCategory: "slots",
		now: new Date("2030-04-01T01:00:00Z"),
	});
	const afterExpiry = await recordBet({
		...gameIdentity(playerId, "post-expiry-bet", "cash-round"),
		amountMinor: 1_000,
		gameCategory: "slots",
		now: new Date("2030-04-02T01:00:00Z"),
	});
	assert.equal(afterExpiry.balances.cashBalanceMinor, 19_000);
	assert.equal(afterExpiry.balances.bonusBalanceMinor, 6_000);

	const settled = await recordWin({
		...gameIdentity(playerId, "expiry-loss", "expiry-round"),
		betAmountMinor: 4_000,
		winAmountMinor: 0,
		now: new Date("2030-04-02T02:00:00Z"),
	});
	assert.equal(settled.balanceMinor, 19_000);
	assert.equal(settled.balances.bonusBalanceMinor, 0);
	const [expired] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, activated.award.id));
	assert.equal(expired?.status, "expired");
});

test("the deterministic simulator retries through production gameplay services", async (context) => {
	const playerId = await createTestPlayer(context, 10_000);
	const input = {
		playerId,
		gameId: "fixture-game",
		runId: crypto.randomUUID(),
		stakeMinor: 2_500,
		outcome: "refund" as const,
	};
	const first = await simulateGameRound(input);
	const retry = await simulateGameRound(input);
	assert.equal(first.bet.isDuplicate, false);
	assert.equal(first.settlement.isDuplicate, false);
	assert.equal(retry.bet.isDuplicate, true);
	assert.equal(retry.settlement.isDuplicate, true);
	assert.equal(retry.settlement.balanceMinor, 10_000);
});

test("concurrent qualifying bets cannot lose wagering progress", async (context) => {
	const playerId = await createTestPlayer(context, 10_000);
	const definition = await createTestBonus(context, {
		playerId,
		amountMinor: 10_000,
		wageringMultiplier: 5,
		eligibleCategories: ["slots"],
	});
	const activated = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:award`,
	});
	await Promise.all([
		recordBet({
			...gameIdentity(playerId, "concurrent-a", "concurrent-round-a"),
			amountMinor: 2_000,
			gameCategory: "slots",
		}),
		recordBet({
			...gameIdentity(playerId, "concurrent-b", "concurrent-round-b"),
			amountMinor: 2_000,
			gameCategory: "slots",
		}),
	]);
	const [award] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, activated.award.id));
	assert.equal(award?.completedWagerMinor, 4_000);
	assert.equal(award?.bonusBalanceMinor, 6_000);
});

test("suspended players cannot read or move gameplay funds", async (context) => {
	const playerId = await createTestPlayer(context, 10_000);
	await db.update(user).set({ banned: true }).where(eq(user.id, playerId));
	await assert.rejects(
		getPlayableWalletBalance(playerId),
		(error) =>
			error instanceof GameplayServiceError && error.code === "INVALID_USER",
	);
	await assert.rejects(
		recordBet({
			...gameIdentity(playerId, "suspended-bet", "suspended-round"),
			amountMinor: 1_000,
		}),
		(error) =>
			error instanceof GameplayServiceError && error.code === "INVALID_USER",
	);
});

test("review: a late win cannot recreate a cancelled bonus", {
	todo: "Known bug: late wins recreate forfeited bonus funds; see .docs/money-engine-review.md",
}, async (context) => {
	const playerId = await createTestPlayer(context, 10_000);
	const definition = await createTestBonus(context, {
		playerId,
		amountMinor: 10_000,
		wageringMultiplier: 5,
		eligibleCategories: [],
	});
	const { award } = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:award`,
	});
	await recordBet({
		...gameIdentity(playerId, `${playerId}:bet`, "late-win"),
		amountMinor: 4_000,
	});
	await settleBonusAward({ awardId: award.id, reason: "cancel" });
	const result = await recordWin({
		...gameIdentity(playerId, `${playerId}:win`, "late-win"),
		betAmountMinor: 4_000,
		winAmountMinor: 8_000,
	});
	assert.equal(result.balances.bonusBalanceMinor, 0);
	const [stored] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, award.id));
	assert.equal(stored?.status, "cancelled");
	assert.equal(stored?.bonusBalanceMinor, 0);
});

test("review: refunds preserve wagering earned above the target", {
	todo: "Known bug: capped progress loses excess wagering before refunds; see .docs/money-engine-review.md",
}, async (context) => {
	const playerId = await createTestPlayer(context, 10_000);
	const definition = await createTestBonus(context, {
		playerId,
		amountMinor: 10_000,
		wageringMultiplier: 2,
		eligibleCategories: [],
	});
	const { award } = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:award`,
	});
	await recordBet({
		...gameIdentity(playerId, `${playerId}:a`, "a"),
		amountMinor: 8_000,
	});
	await recordWin({
		...gameIdentity(playerId, `${playerId}:aw`, "a"),
		betAmountMinor: 8_000,
		winAmountMinor: 20_000,
	});
	await recordBet({
		...gameIdentity(playerId, `${playerId}:b`, "b"),
		amountMinor: 8_000,
	});
	await recordBet({
		...gameIdentity(playerId, `${playerId}:c`, "c"),
		amountMinor: 8_000,
	});
	// Net qualifying stakes are 8,000 + 8,000 + 8,000 - 2,000 = 22,000.
	await recordRefund({
		...gameIdentity(playerId, `${playerId}:refund`, "c"),
		amountMinor: 2_000,
	});
	const [stored] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, award.id));
	assert.equal(stored?.completedWagerMinor, 20_000);
});

async function createTestPlayer(
	context: TestContext,
	cashBalanceMinor: number,
) {
	const playerId = `gameplay-test-${crypto.randomUUID()}`;
	await db.insert(user).values({
		id: playerId,
		name: "Gameplay Test",
		email: `${playerId}@bearbet.test`,
	});
	await db.insert(player).values({
		userId: playerId,
		firstName: "Gameplay",
		lastName: "Test",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db
		.insert(wallet)
		.values({ playerId, currencyCode: "USD", cashBalanceMinor });
	context.after(async () => cleanupPlayer(playerId));
	return playerId;
}

async function createTestBonus(
	_context: TestContext,
	input: {
		playerId: string;
		amountMinor: number;
		wageringMultiplier: number;
		eligibleCategories: string[];
		expiresAfterDays?: number;
	},
) {
	const definition = await createBonusDefinition({
		code: `GAME_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
		name: "Gameplay award",
		type: "promotional",
		amountMinor: input.amountMinor,
		wageringMultiplier: input.wageringMultiplier,
		expiresAfterDays: input.expiresAfterDays ?? 7,
		eligibleCategories: input.eligibleCategories,
	});
	return definition;
}

function gameIdentity(
	playerId: string,
	transactionId: string,
	roundId: string,
) {
	return {
		integrationProvider: "fixture",
		playerId,
		externalTransactionId: transactionId,
		externalSessionId: `session-${playerId}`,
		externalRoundId: roundId,
		gameId: "game-1",
	};
}

async function cleanupPlayer(playerId: string) {
	const [storedWallet] = await db
		.select({ id: wallet.id })
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	const awards = await db
		.select({ definitionId: bonusAward.definitionId })
		.from(bonusAward)
		.where(eq(bonusAward.playerId, playerId));
	await db
		.delete(providerOperation)
		.where(eq(providerOperation.playerId, playerId));
	await db.delete(gameRound).where(eq(gameRound.playerId, playerId));
	await db.delete(gameSession).where(eq(gameSession.playerId, playerId));
	await db.delete(bonusAward).where(eq(bonusAward.playerId, playerId));
	const definitionIds = awards.map((award) => award.definitionId);
	if (definitionIds.length > 0) {
		await db
			.delete(bonusDefinition)
			.where(inArray(bonusDefinition.id, definitionIds));
	}
	if (storedWallet) {
		await db
			.delete(ledgerEntry)
			.where(eq(ledgerEntry.walletId, storedWallet.id));
		await db
			.delete(walletOperation)
			.where(eq(walletOperation.walletId, storedWallet.id));
		await db.delete(wallet).where(eq(wallet.id, storedWallet.id));
	}
	await db.delete(player).where(eq(player.userId, playerId));
	await db.delete(user).where(eq(user.id, playerId));
}
