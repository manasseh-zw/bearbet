import assert from "node:assert/strict";
import test, { after } from "node:test";

import { count, eq } from "drizzle-orm";
import type { RegisterPlayerInput } from "#/lib/schemas/auth.schema";
import { auth } from "#/server/infra/auth/auth";
import { db, pool } from "#/server/infra/db";
import {
	account,
	ledgerEntry,
	player,
	user,
	wallet,
} from "#/server/infra/db/schema";

import {
	getActivePlayerAccountDetails,
	registerPlayer,
	WELCOME_CREDIT_MINOR,
} from "./player.service";

type SignUpEmailInput = NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>;

async function signUpPlayer(input: RegisterPlayerInput) {
	const body: SignUpEmailInput["body"] & RegisterPlayerInput = {
		...input,
		name: `${input.firstName} ${input.lastName}`,
	};

	return auth.api.signUpEmail({ body });
}

after(async () => {
	await pool.end();
});

test("player registration provisions one player and one funded wallet", async (context) => {
	const uniquePart = crypto.randomUUID();
	const email = `player-${uniquePart}@bearbet.test`;
	const username = `player_${uniquePart.replaceAll("-", "").slice(0, 12)}`;

	const signUp = await signUpPlayer({
		email,
		password: "correct-horse-battery-staple",
		username,
		firstName: "Test",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "zw",
		currencyCode: "usd",
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

	await registerPlayer({
		userId,
		firstName: "Test",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "zw",
		currencyCode: "usd",
	});

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
	const providerAccount = await getActivePlayerAccountDetails(userId);
	assert.equal(providerAccount.email, email);
	assert.equal(providerAccount.name, "Test Player");
	assert.ok(providerAccount.createdAt instanceof Date);

	const emailSignIn = await auth.api.signInEmail({
		body: {
			email,
			password: "correct-horse-battery-staple",
		},
	});
	const usernameSignIn = await auth.api.signInUsername({
		body: {
			username,
			password: "correct-horse-battery-staple",
		},
	});

	assert.equal(emailSignIn.user.id, userId);
	assert.equal(usernameSignIn.user.id, userId);
});

test("invalid player registration is rejected before identity creation", async () => {
	const uniquePart = crypto.randomUUID();
	const email = `underage-${uniquePart}@bearbet.test`;

	await assert.rejects(
		signUpPlayer({
			email,
			password: "correct-horse-battery-staple",
			username: `underage_${uniquePart.replaceAll("-", "").slice(0, 12)}`,
			firstName: "Test",
			lastName: "Player",
			dateOfBirth: new Date().toISOString().slice(0, 10),
			countryCode: "zw",
			currencyCode: "usd",
		}),
		/at least 18 years old/,
	);

	const [identityCount] = await db
		.select({ value: count() })
		.from(user)
		.where(eq(user.email, email));

	assert.equal(identityCount?.value, 0);
});
