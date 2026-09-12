import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { asc, eq } from "drizzle-orm";
import { MoneyRuleError } from "#/server/domains/wallet/wallet.policy";
import { db, pool } from "#/server/infra/db";
import {
	ledgerEntry,
	player,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

import {
	applyWalletOperation,
	demoTopUp,
	WalletOperationError,
} from "./wallet.service";

const playerId = `wallet-test-${crypto.randomUUID()}`;

before(async () => {
	await db.insert(user).values({
		id: playerId,
		name: "Wallet Test",
		email: `${playerId}@bearbet.test`,
	});
	await db.insert(player).values({
		userId: playerId,
		firstName: "Wallet",
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
	await pool.end();
});

test("wallet operation moves balances and writes ordered immutable evidence", async () => {
	const result = await applyWalletOperation({
		playerId,
		type: "bet",
		idempotencyKey: `${playerId}:mixed-bet`,
		movements: [
			{ bucket: "bonus", amountMinor: 5_000 },
			{ bucket: "bonus", amountMinor: -2_000 },
			{ bucket: "cash", amountMinor: -3_000 },
		],
		sourceType: "gameplay",
		sourceId: "bet-1",
	});

	assert.deepEqual(result.balances, {
		cashBalanceMinor: 97_000,
		bonusBalanceMinor: 3_000,
		reservedCashMinor: 0,
	});

	const entries = await db
		.select()
		.from(ledgerEntry)
		.where(eq(ledgerEntry.operationId, result.operationId))
		.orderBy(asc(ledgerEntry.movementIndex));
	assert.deepEqual(
		entries.map((entry) => ({
			bucket: entry.bucket,
			amountMinor: entry.amountMinor,
			before: entry.balanceBeforeMinor,
			after: entry.balanceAfterMinor,
		})),
		[
			{ bucket: "bonus", amountMinor: 5_000, before: 0, after: 5_000 },
			{ bucket: "bonus", amountMinor: -2_000, before: 5_000, after: 3_000 },
			{ bucket: "cash", amountMinor: -3_000, before: 100_000, after: 97_000 },
		],
	);
});

test("an identical retry returns its original result without moving money again", async () => {
	const input = {
		playerId,
		type: "admin_adjustment" as const,
		idempotencyKey: `${playerId}:retry`,
		movements: [{ bucket: "cash" as const, amountMinor: 123 }],
	};
	const first = await applyWalletOperation(input);
	await demoTopUp({
		playerId,
		amountMinor: 10_000,
		idempotencyKey: `${playerId}:later-top-up`,
	});
	const retry = await applyWalletOperation(input);

	assert.equal(retry.isDuplicate, true);
	assert.equal(retry.operationId, first.operationId);
	assert.deepEqual(retry.balances, first.balances);

	const entries = await db
		.select()
		.from(ledgerEntry)
		.where(eq(ledgerEntry.operationId, first.operationId));
	assert.equal(entries.length, 1);
});

test("reuse of an idempotency key with a different payload is rejected", async () => {
	const idempotencyKey = `${playerId}:conflict`;
	await applyWalletOperation({
		playerId,
		type: "admin_adjustment",
		idempotencyKey,
		movements: [{ bucket: "cash", amountMinor: 100 }],
	});
	await assert.rejects(
		applyWalletOperation({
			playerId,
			type: "admin_adjustment",
			idempotencyKey,
			movements: [{ bucket: "cash", amountMinor: 200 }],
		}),
		(error) =>
			error instanceof WalletOperationError &&
			error.code === "IDEMPOTENCY_CONFLICT",
	);
});

test("concurrent debits serialize and cannot overdraw the wallet", async () => {
	const isolatedPlayerId = `concurrent-${crypto.randomUUID()}`;
	await db.insert(user).values({
		id: isolatedPlayerId,
		name: "Concurrent Test",
		email: `${isolatedPlayerId}@bearbet.test`,
	});
	await db.insert(player).values({
		userId: isolatedPlayerId,
		firstName: "Concurrent",
		lastName: "Test",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	const [isolatedWallet] = await db
		.insert(wallet)
		.values({
			playerId: isolatedPlayerId,
			currencyCode: "USD",
			cashBalanceMinor: 1_000,
		})
		.returning();

	try {
		const results = await Promise.allSettled([
			applyWalletOperation({
				playerId: isolatedPlayerId,
				type: "bet",
				idempotencyKey: `${isolatedPlayerId}:debit-1`,
				movements: [{ bucket: "cash", amountMinor: -800 }],
			}),
			applyWalletOperation({
				playerId: isolatedPlayerId,
				type: "bet",
				idempotencyKey: `${isolatedPlayerId}:debit-2`,
				movements: [{ bucket: "cash", amountMinor: -800 }],
			}),
		]);
		assert.equal(
			results.filter((result) => result.status === "fulfilled").length,
			1,
		);
		const rejection = results.find((result) => result.status === "rejected");
		assert.ok(rejection?.reason instanceof MoneyRuleError);
		assert.equal(rejection.reason.code, "INSUFFICIENT_FUNDS");

		const [finalWallet] = await db
			.select()
			.from(wallet)
			.where(eq(wallet.playerId, isolatedPlayerId));
		assert.equal(finalWallet?.cashBalanceMinor, 200);
	} finally {
		if (isolatedWallet) {
			await db
				.delete(ledgerEntry)
				.where(eq(ledgerEntry.walletId, isolatedWallet.id));
			await db
				.delete(walletOperation)
				.where(eq(walletOperation.walletId, isolatedWallet.id));
			await db.delete(wallet).where(eq(wallet.id, isolatedWallet.id));
		}
		await db.delete(player).where(eq(player.userId, isolatedPlayerId));
		await db.delete(user).where(eq(user.id, isolatedPlayerId));
	}
});

test("demo top-ups accept only the four configured amounts", async () => {
	await assert.rejects(
		demoTopUp({
			playerId,
			amountMinor: 999,
			idempotencyKey: `${playerId}:bad-top-up`,
		}),
		WalletOperationError,
	);
	const result = await demoTopUp({
		playerId,
		amountMinor: 50_000,
		idempotencyKey: `${playerId}:valid-top-up`,
	});
	assert.equal(result.balances.cashBalanceMinor > 100_000, true);
});
