import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { eq } from "drizzle-orm";

import {
	recordBet,
	recordWin,
} from "#/server/domains/gameplay/gameplay.service";
import { applyWalletOperation } from "#/server/domains/wallet/wallet.service";
import { db, pool } from "#/server/infra/db";
import {
	gameRound,
	gameSession,
	ledgerEntry,
	player,
	providerOperation,
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
	const gameplayIdentity = {
		integrationProvider: "fixture",
		playerId,
		externalSessionId: `${playerId}:session`,
		externalRoundId: `${playerId}:round`,
		gameId: "history-game",
	};
	await recordBet({
		...gameplayIdentity,
		externalTransactionId: `${playerId}:game-bet`,
		amountMinor: 200,
	});
	await recordWin({
		...gameplayIdentity,
		externalTransactionId: `${playerId}:game-win`,
		betAmountMinor: 200,
		winAmountMinor: 400,
	});
});

after(async () => {
	const [storedWallet] = await db
		.select({ id: wallet.id })
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	if (storedWallet) {
		await db
			.delete(providerOperation)
			.where(eq(providerOperation.playerId, playerId));
		await db.delete(gameRound).where(eq(gameRound.playerId, playerId));
		await db.delete(gameSession).where(eq(gameSession.playerId, playerId));
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

	assert.equal(history.pagination.total, 6);
	assert.deepEqual(history.counts, {
		all: 6,
		wallet: 2,
		bet: 2,
		win: 1,
		refund: 1,
	});
	assert.ok(
		history.items.every((item) =>
			/^BB-[0-9A-F]{4}(?:-[0-9A-F]{4}){2}$/.test(item.publicReference),
		),
	);

	const bet = history.items.find(
		(item) => item.type === "bet" && item.sourceType === null,
	);
	assert.equal(bet?.amountMinor, -100);
	assert.deepEqual(bet?.buckets.sort(), ["bonus", "cash"]);

	const withdrawal = history.items.find(
		(item) => item.type === "withdrawal_reserve",
	);
	assert.equal(withdrawal?.amountMinor, -100);
});

test("bet history groups gameplay operations into a clear round result", async () => {
	const bets = await getPlayerHistory(playerId, {
		category: "bet",
		page: 1,
	});
	assert.equal(bets.pagination.total, 1);
	assert.equal(bets.items.length, 0);
	assert.equal(bets.betRounds[0]?.gameId, "history-game");
	assert.equal(bets.betRounds[0]?.outcome, "won");
	assert.equal(bets.betRounds[0]?.stakeMinor, 200);
	assert.equal(bets.betRounds[0]?.returnedMinor, 400);
	assert.equal(bets.betRounds[0]?.netMinor, 200);
	assert.match(
		bets.betRounds[0]?.publicReference ?? "",
		/^BB-[0-9A-F]{4}(?:-[0-9A-F]{4}){2}$/,
	);

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
