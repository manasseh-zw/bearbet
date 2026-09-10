import assert from "node:assert/strict";
import test, { after } from "node:test";

import { count, eq } from "drizzle-orm";
import { auth } from "#/server/infra/auth/auth";
import { db, pool } from "#/server/infra/db";
import {
	account,
	ledgerEntry,
	player,
	user,
	wallet,
} from "#/server/infra/db/schema";

import { provisionPlayer, WELCOME_CREDIT_MINOR } from "./player.service";

after(async () => {
	await pool.end();
});

test("Better Auth identity is provisioned as one player and one funded wallet", async (context) => {
	const uniquePart = crypto.randomUUID();
	const email = `player-${uniquePart}@bearbet.test`;
	const username = `player_${uniquePart.replaceAll("-", "").slice(0, 12)}`;

	const signUp = await auth.api.signUpEmail({
		body: {
			email,
			name: "Test Player",
			password: "correct-horse-battery-staple",
			username,
		},
	});

	const userId = signUp.user.id;

	context.after(async () => {
		const rows = await db
			.select({ id: wallet.id })
			.from(wallet)
			.where(eq(wallet.playerId, userId));
		const walletId = rows[0]?.id;

		if (walletId) {
			await db.delete(ledgerEntry).where(eq(ledgerEntry.walletId, walletId));
			await db.delete(wallet).where(eq(wallet.id, walletId));
		}

		await db.delete(player).where(eq(player.userId, userId));
		await db.delete(user).where(eq(user.id, userId));
	});

	const profile = {
		userId,
		firstName: "Test",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "zw",
		currencyCode: "usd",
	};

	await Promise.all([provisionPlayer(profile), provisionPlayer(profile)]);

	const [playerCount] = await db
		.select({ value: count() })
		.from(player)
		.where(eq(player.userId, userId));
	const [walletCount] = await db
		.select({ value: count() })
		.from(wallet)
		.where(eq(wallet.playerId, userId));
	const [welcomeCount] = await db
		.select({ value: count() })
		.from(ledgerEntry)
		.innerJoin(wallet, eq(ledgerEntry.walletId, wallet.id))
		.where(eq(wallet.playerId, userId));
	const [storedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, userId));
	const [credentialAccount] = await db
		.select()
		.from(account)
		.where(eq(account.userId, userId));

	assert.equal(playerCount?.value, 1);
	assert.equal(walletCount?.value, 1);
	assert.equal(welcomeCount?.value, 1);
	assert.equal(storedWallet?.cashBalanceMinor, WELCOME_CREDIT_MINOR);
	assert.equal(storedWallet?.currencyCode, "USD");
	assert.equal(credentialAccount?.providerId, "credential");
});
