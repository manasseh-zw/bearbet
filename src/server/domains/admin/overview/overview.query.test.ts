import assert from "node:assert/strict";
import test, { after } from "node:test";

import { eq } from "drizzle-orm";
import { applyWalletOperation } from "#/server/domains/wallet/wallet.service";
import { requestWithdrawal } from "#/server/domains/withdrawal/withdrawal.service";
import { db, pool } from "#/server/infra/db";
import {
	ledgerEntry,
	player,
	user,
	wallet,
	walletOperation,
	withdrawal,
} from "#/server/infra/db/schema";

import { getAdminOverview } from "./overview.query";

const suffix = crypto.randomUUID();
const playerId = `overview-player-${suffix}`;

after(async () => {
	const [storedWallet] = await db
		.select({ id: wallet.id })
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	if (storedWallet) {
		await db.delete(withdrawal).where(eq(withdrawal.playerId, playerId));
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

test("admin overview combines live counts, activity, and daily operations", async () => {
	await db.insert(user).values({
		id: playerId,
		name: "Overview Player",
		email: `${playerId}@bearbet.test`,
		role: "user",
	});
	await db.insert(player).values({
		userId: playerId,
		firstName: "Overview",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(wallet).values({
		playerId,
		currencyCode: "USD",
		cashBalanceMinor: 50_000,
	});

	await applyWalletOperation({
		playerId,
		type: "demo_top_up",
		idempotencyKey: `${playerId}:top-up`,
		movements: [{ bucket: "cash", amountMinor: 500 }],
	});
	await requestWithdrawal({
		playerId,
		amountMinor: 100,
		idempotencyKey: `${playerId}:withdrawal`,
	});

	const overview = await getAdminOverview();

	assert.equal(overview.operations.length, 7);
	assert.equal(
		overview.operations.some((day) => day.walletOperations > 0),
		true,
	);
	assert.equal(overview.stats.registeredPlayers >= 1, true);
	assert.equal(overview.stats.pendingWithdrawals >= 1, true);
	assert.equal(
		overview.recentActivity.some(
			(event) =>
				event.subject === "Overview Player" && event.kind === "withdrawal",
		),
		true,
	);
});
