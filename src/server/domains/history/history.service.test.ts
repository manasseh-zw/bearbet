import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { eq } from "drizzle-orm";

import { applyWalletOperation } from "#/server/domains/wallet/wallet.service";
import { db, pool } from "#/server/infra/db";
import {
	ledgerEntry,
	player,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

import { getPlayerHistory } from "./history.service";

const playerId = `history-test-${crypto.randomUUID()}`;

before(async () => {
	await db.insert(user).values({
		id: playerId,
		name: "History Test",
		email: `${playerId}@bearbet.test`,
	});
	await db.insert(player).values({
		userId: playerId,
		firstName: "History",
		lastName: "Test",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(wallet).values({
		playerId,
		currencyCode: "USD",
		cashBalanceMinor: 10_000,
		bonusBalanceMinor: 100,
	});

	await Promise.all([
		applyWalletOperation({
			playerId,
			type: "demo_top_up",
			idempotencyKey: `${playerId}:top-up`,
			movements: [{ bucket: "cash", amountMinor: 500 }],
		}),
		applyWalletOperation({
			playerId,
			type: "refund",
			idempotencyKey: `${playerId}:refund`,
			movements: [{ bucket: "cash", amountMinor: 50 }],
		}),
	]);
	await applyWalletOperation({
		playerId,
		type: "bet",
		idempotencyKey: `${playerId}:mixed-bet`,
		movements: [
			{ bucket: "bonus", amountMinor: -40 },
			{ bucket: "cash", amountMinor: -60 },
		],
	});
	await applyWalletOperation({
		playerId,
		type: "withdrawal_reserve",
		idempotencyKey: `${playerId}:withdrawal`,
		movements: [
			{ bucket: "cash", amountMinor: -100 },
			{ bucket: "reserved_cash", amountMinor: 100 },
		],
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

test("history returns one row per operation with category counts", async () => {
	const history = await getPlayerHistory(playerId, {
		category: "all",
		page: 1,
	});

	assert.equal(history.pagination.total, 4);
	assert.deepEqual(history.counts, {
		all: 4,
		wallet: 2,
		bet: 1,
		win: 0,
		refund: 1,
	});

	const bet = history.items.find((item) => item.type === "bet");
	assert.equal(bet?.amountMinor, -100);
	assert.deepEqual(bet?.buckets.sort(), ["bonus", "cash"]);

	const withdrawal = history.items.find(
		(item) => item.type === "withdrawal_reserve",
	);
	assert.equal(withdrawal?.amountMinor, -100);
});

test("history filters by category and wallet bucket", async () => {
	const bets = await getPlayerHistory(playerId, {
		category: "bet",
		page: 1,
		bucket: "bonus",
	});
	assert.equal(bets.pagination.total, 1);
	assert.equal(bets.items[0]?.type, "bet");

	const walletOnly = await getPlayerHistory(playerId, {
		category: "wallet",
		page: 1,
	});
	assert.equal(walletOnly.pagination.total, 2);
	assert.equal(
		walletOnly.items.some((item) => item.type === "bet"),
		false,
	);
});
