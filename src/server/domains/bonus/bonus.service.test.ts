import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { eq, inArray } from "drizzle-orm";
import { demoTopUp } from "#/server/domains/wallet/wallet.service";
import { db, pool } from "#/server/infra/db";
import {
	bonusAward,
	bonusDefinition,
	ledgerEntry,
	player,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

import {
	activateBonusAward,
	BonusServiceError,
	createBonusDefinition,
	settleBonusAward,
} from "./bonus.service";

const playerId = `bonus-test-${crypto.randomUUID()}`;
const definitionIds: string[] = [];

before(async () => {
	await db.insert(user).values({
		id: playerId,
		name: "Bonus Test",
		email: `${playerId}@bearbet.test`,
	});
	await db.insert(player).values({
		userId: playerId,
		firstName: "Bonus",
		lastName: "Test",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(wallet).values({
		playerId,
		currencyCode: "USD",
		cashBalanceMinor: 100_000,
	});
});

after(async () => {
	const [storedWallet] = await db
		.select({ id: wallet.id })
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	await db.delete(bonusAward).where(eq(bonusAward.playerId, playerId));
	if (storedWallet) {
		await db
			.delete(ledgerEntry)
			.where(eq(ledgerEntry.walletId, storedWallet.id));
		await db
			.delete(walletOperation)
			.where(eq(walletOperation.walletId, storedWallet.id));
	}
	if (definitionIds.length > 0) {
		await db
			.delete(bonusDefinition)
			.where(inArray(bonusDefinition.id, definitionIds));
	}
	if (storedWallet)
		await db.delete(wallet).where(eq(wallet.id, storedWallet.id));
	await db.delete(player).where(eq(player.userId, playerId));
	await db.delete(user).where(eq(user.id, playerId));
	await pool.end();
});

test("bonus activation snapshots rules, credits once, and blocks competing awards", async () => {
	const definition = await createBonusDefinition({
		code: `promo_${crypto.randomUUID().slice(0, 8)}`,
		name: "Slots starter",
		type: "promotional",
		amountMinor: 10_000,
		maximumAwardMinor: 8_000,
		wageringMultiplier: 5,
		expiresAfterDays: 7,
		eligibleCategories: ["slots", "slots", ""],
	});
	definitionIds.push(definition.id);
	const idempotencyKey = `${playerId}:starter-award`;
	const first = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey,
		now: new Date("2030-01-01T00:00:00Z"),
	});
	const retry = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey,
		now: new Date("2030-01-02T00:00:00Z"),
	});

	assert.equal(first.award.awardedAmountMinor, 8_000);
	assert.equal(first.award.requiredWagerMinor, 40_000);
	assert.deepEqual(first.award.eligibleCategories, ["slots"]);
	assert.equal(retry.isDuplicate, true);
	assert.equal(retry.award.id, first.award.id);
	const [fundedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	assert.equal(fundedWallet?.bonusBalanceMinor, 8_000);

	const competing = await createBonusDefinition({
		code: `other_${crypto.randomUUID().slice(0, 8)}`,
		name: "Competing offer",
		type: "promotional",
		amountMinor: 5_000,
		wageringMultiplier: 3,
		expiresAfterDays: 3,
	});
	definitionIds.push(competing.id);
	await assert.rejects(
		activateBonusAward({
			playerId,
			definitionId: competing.id,
			idempotencyKey: `${playerId}:competing-award`,
		}),
		(error) =>
			error instanceof BonusServiceError &&
			error.code === "ACTIVE_BONUS_EXISTS",
	);

	const cancelled = await settleBonusAward({
		awardId: first.award.id,
		reason: "cancel",
		now: new Date("2030-01-03T00:00:00Z"),
	});
	assert.equal(cancelled.award.status, "cancelled");
	assert.equal(cancelled.award.bonusBalanceMinor, 0);
	const cancelledRetry = await settleBonusAward({
		awardId: first.award.id,
		reason: "cancel",
	});
	assert.equal(cancelledRetry.isDuplicate, true);

	const concurrentKey = `${playerId}:concurrent-award`;
	const concurrent = await Promise.all([
		activateBonusAward({
			playerId,
			definitionId: competing.id,
			idempotencyKey: concurrentKey,
		}),
		activateBonusAward({
			playerId,
			definitionId: competing.id,
			idempotencyKey: concurrentKey,
		}),
	]);
	assert.equal(concurrent.filter((result) => result.isDuplicate).length, 1);
	await settleBonusAward({
		awardId: concurrent[0].award.id,
		reason: "cancel",
	});
});

test("deposit awards verify persisted top-ups and completed awards convert once", async () => {
	const topUp = await demoTopUp({
		playerId,
		amountMinor: 50_000,
		idempotencyKey: `${playerId}:qualifying-top-up`,
	});
	const definition = await createBonusDefinition({
		code: `deposit_${crypto.randomUUID().slice(0, 8)}`,
		name: "Deposit award",
		type: "deposit",
		amountMinor: 10_000,
		wageringMultiplier: 5,
		expiresAfterDays: 7,
		minimumDepositMinor: 50_000,
	});
	definitionIds.push(definition.id);

	await assert.rejects(
		activateBonusAward({
			playerId,
			definitionId: definition.id,
			idempotencyKey: `${playerId}:missing-deposit`,
		}),
		(error) =>
			error instanceof BonusServiceError &&
			error.code === "DEPOSIT_NOT_ELIGIBLE",
	);
	const activated = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:deposit-award`,
		qualifyingDepositOperationId: topUp.operationId,
		now: new Date("2030-02-01T00:00:00Z"),
	});

	await db
		.update(bonusAward)
		.set({ completedWagerMinor: activated.award.requiredWagerMinor })
		.where(eq(bonusAward.id, activated.award.id));
	const completed = await settleBonusAward({
		awardId: activated.award.id,
		reason: "evaluate",
		now: new Date("2030-02-02T00:00:00Z"),
	});
	assert.equal(completed.award.status, "completed");

	const [convertedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	assert.equal(convertedWallet?.bonusBalanceMinor, 0);
	assert.equal(convertedWallet?.cashBalanceMinor, 160_000);

	const retry = await settleBonusAward({
		awardId: activated.award.id,
		reason: "evaluate",
	});
	assert.equal(retry.isDuplicate, true);
	const conversionEntries = await db
		.select()
		.from(ledgerEntry)
		.where(eq(ledgerEntry.sourceId, activated.award.id));
	assert.equal(
		conversionEntries.filter((entry) => entry.type === "bonus_conversion")
			.length,
		2,
	);

	const reusedDepositDefinition = await createBonusDefinition({
		code: `reuse_${crypto.randomUUID().slice(0, 8)}`,
		name: "Another deposit award",
		type: "deposit",
		amountMinor: 2_000,
		wageringMultiplier: 2,
		expiresAfterDays: 2,
		minimumDepositMinor: 10_000,
	});
	definitionIds.push(reusedDepositDefinition.id);
	await assert.rejects(
		activateBonusAward({
			playerId,
			definitionId: reusedDepositDefinition.id,
			idempotencyKey: `${playerId}:reused-deposit`,
			qualifyingDepositOperationId: topUp.operationId,
		}),
		(error) =>
			error instanceof BonusServiceError &&
			error.code === "DEPOSIT_NOT_ELIGIBLE",
	);
});

test("expiry forfeits remaining bonus without crediting cash", async () => {
	const definition = await createBonusDefinition({
		code: `expiry_${crypto.randomUUID().slice(0, 8)}`,
		name: "Short award",
		type: "promotional",
		amountMinor: 3_500,
		wageringMultiplier: 2,
		expiresAfterDays: 1,
	});
	definitionIds.push(definition.id);
	const activated = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:expiry-award`,
		now: new Date("2030-03-01T00:00:00Z"),
	});
	const [before] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));

	await assert.rejects(
		settleBonusAward({
			awardId: activated.award.id,
			reason: "expire",
			now: new Date("2030-03-01T12:00:00Z"),
		}),
		BonusServiceError,
	);
	const expired = await settleBonusAward({
		awardId: activated.award.id,
		reason: "expire",
		now: new Date("2030-03-02T00:00:00Z"),
	});
	const [afterExpiry] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	assert.equal(expired.award.status, "expired");
	assert.equal(afterExpiry?.cashBalanceMinor, before?.cashBalanceMinor);
	assert.equal(afterExpiry?.bonusBalanceMinor, 0);
});
