import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { and, eq, inArray } from "drizzle-orm";

import {
	activateBonusAward,
	createBonusDefinition,
} from "#/server/domains/bonus/bonus.service";
import { env } from "#/server/env";
import { db, pool } from "#/server/infra/db";
import {
	bonusAward,
	bonusDefinition,
	game,
	gameProvider,
	gameSession,
	ledgerEntry,
	player,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

import {
	closeCurrentPlayerGame,
	closeDemoGame,
	startCurrentPlayerGame,
	startDemoGame,
} from "./demo-game.service";

const playerId = `demo-session-test-${crypto.randomUUID()}`;
const gameId = `demo-game-${crypto.randomUUID()}`;
const bonusDefinitionIds: string[] = [];

before(async () => {
	await db
		.insert(gameProvider)
		.values({ id: env.CASINO_PROVIDER, name: env.CASINO_PROVIDER })
		.onConflictDoNothing();
	await db.insert(game).values({
		providerId: env.CASINO_PROVIDER,
		externalId: gameId,
		name: "Session restore test game",
		contentProvider: "BearBet",
		type: "slots",
		supportsFun: true,
		isAvailable: true,
		isMobile: true,
		hasFreeSpins: false,
		hasLobby: false,
		hasTables: false,
		lastSeenAt: new Date(),
	});
	await db.insert(user).values({
		id: playerId,
		name: "Demo Session Test",
		email: `${playerId}@bearbet.test`,
	});
	await db.insert(player).values({
		userId: playerId,
		firstName: "Demo",
		lastName: "Session",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(wallet).values({
		playerId,
		currencyCode: "USD",
		cashBalanceMinor: 10_000,
	});
});

after(async () => {
	await db.delete(gameSession).where(eq(gameSession.playerId, playerId));
	await db.delete(bonusAward).where(eq(bonusAward.playerId, playerId));
	const [testWallet] = await db
		.select({ id: wallet.id })
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	if (testWallet) {
		await db.delete(ledgerEntry).where(eq(ledgerEntry.walletId, testWallet.id));
		await db
			.delete(walletOperation)
			.where(eq(walletOperation.walletId, testWallet.id));
	}
	await db.delete(wallet).where(eq(wallet.playerId, playerId));
	await db.delete(player).where(eq(player.userId, playerId));
	await db.delete(user).where(eq(user.id, playerId));
	if (bonusDefinitionIds.length > 0) {
		await db
			.delete(bonusDefinition)
			.where(inArray(bonusDefinition.id, bonusDefinitionIds));
	}
	await db
		.delete(game)
		.where(
			and(
				eq(game.providerId, env.CASINO_PROVIDER),
				eq(game.externalId, gameId),
			),
		);
	await pool.end();
});

test("starting a game resumes its active session across new launch keys", async () => {
	const [first, refreshed] = await Promise.all([
		startDemoGame({
			playerId,
			gameId,
			launchKey: crypto.randomUUID(),
		}),
		startDemoGame({
			playerId,
			gameId,
			launchKey: crypto.randomUUID(),
		}),
	]);

	assert.equal(refreshed.sessionId, first.sessionId);
	const activeSessions = await db
		.select({ id: gameSession.id })
		.from(gameSession)
		.where(
			and(
				eq(gameSession.playerId, playerId),
				eq(gameSession.gameId, gameId),
				eq(gameSession.status, "active"),
			),
		);
	assert.equal(activeSessions.length, 1);

	await closeDemoGame({ playerId, sessionId: first.sessionId });
	const next = await startDemoGame({
		playerId,
		gameId,
		launchKey: crypto.randomUUID(),
	});
	assert.notEqual(next.sessionId, first.sessionId);
	await closeDemoGame({ playerId, sessionId: next.sessionId });
});

test("BigBang sessions reconcile one provider delta and resume without relaunching", {
	skip: env.CASINO_PROVIDER !== "bigbang",
}, async () => {
	await db
		.update(wallet)
		.set({ cashBalanceMinor: 81_700, bonusBalanceMinor: 0 })
		.where(eq(wallet.playerId, playerId));

	let providerBalanceMinor = 10_000_000;
	let launchCalls = 0;
	let balanceReads = 0;
	const provider = {
		async syncCatalogue() {
			throw new Error("Not used by this test");
		},
		async launchGame() {
			launchCalls += 1;
			balanceReads += 1;
			return {
				url: "https://games.example/real/session",
				externalSessionId: "provider-session-test",
				providerPlayerId: playerId,
				providerBalanceMinor,
				providerCurrencyCode: "USD",
			};
		},
		async getPlayerBalance(playerId: string) {
			balanceReads += 1;
			return {
				playerId,
				balanceMinor: providerBalanceMinor,
				currencyCode: "USD",
			};
		},
	};

	const first = await startCurrentPlayerGame(
		{
			playerId,
			gameId,
			launchKey: crypto.randomUUID(),
		},
		provider,
	);
	const refreshed = await startCurrentPlayerGame(
		{
			playerId,
			gameId,
			launchKey: crypto.randomUUID(),
		},
		provider,
	);
	assert.equal(first.launchMode, "provider");
	assert.equal(refreshed.sessionId, first.sessionId);
	assert.equal(launchCalls, 1);
	assert.equal(balanceReads, 1);

	providerBalanceMinor = 10_081_700;
	const closed = await closeCurrentPlayerGame(
		{ playerId, sessionId: first.sessionId },
		provider,
	);
	assert.equal(closed.kind, "provider");
	assert.equal(closed.netDeltaMinor, 81_700);
	assert.equal(closed.reconciliationApplied, true);
	assert.equal(balanceReads, 2);

	const retried = await closeCurrentPlayerGame(
		{ playerId, sessionId: first.sessionId },
		provider,
	);
	assert.equal(retried.kind, "provider");
	assert.equal(retried.netDeltaMinor, 81_700);
	assert.equal(balanceReads, 2);
	assert.equal(
		(await db.select().from(wallet).where(eq(wallet.playerId, playerId)))[0]
			?.cashBalanceMinor,
		163_400,
	);
});

test("BigBang shared synthetic balance does not credit the provider baseline", {
	skip: env.CASINO_PROVIDER !== "bigbang",
}, async () => {
	await db
		.update(wallet)
		.set({ cashBalanceMinor: 800_000, bonusBalanceMinor: 0 })
		.where(eq(wallet.playerId, playerId));

	const providerBalanceMinor = 10_000_000;
	const provider = {
		async syncCatalogue() {
			throw new Error("Not used by this test");
		},
		async launchGame() {
			return {
				url: "https://games.example/real/session",
				externalSessionId: "provider-shared-baseline-test",
				providerPlayerId: playerId,
				providerBalanceMinor,
				providerCurrencyCode: "USD",
			};
		},
		async getPlayerBalance(playerId: string) {
			return {
				playerId,
				balanceMinor: providerBalanceMinor,
				currencyCode: "USD",
			};
		},
	};

	const started = await startCurrentPlayerGame(
		{
			playerId,
			gameId,
			launchKey: crypto.randomUUID(),
		},
		provider,
	);
	const closed = await closeCurrentPlayerGame(
		{ playerId, sessionId: started.sessionId },
		provider,
	);

	assert.equal(closed.kind, "provider");
	assert.equal(closed.netDeltaMinor, 0);
	assert.equal(closed.reconciliationApplied, false);
	assert.equal(
		(await db.select().from(wallet).where(eq(wallet.playerId, playerId)))[0]
			?.cashBalanceMinor,
		800_000,
	);
});

test("BigBang reconciliation advances and completes the active bonus", {
	skip: env.CASINO_PROVIDER !== "bigbang",
}, async () => {
	await db
		.update(wallet)
		.set({ cashBalanceMinor: 100_000, bonusBalanceMinor: 0 })
		.where(eq(wallet.playerId, playerId));

	const definition = await createBonusDefinition({
		code: `provider_${crypto.randomUUID().slice(0, 8)}`,
		name: "Provider reconciliation bonus",
		type: "promotional",
		amountMinor: 2_500,
		wageringMultiplier: 5,
		expiresAfterDays: 7,
	});
	bonusDefinitionIds.push(definition.id);
	const activated = await activateBonusAward({
		playerId,
		definitionId: definition.id,
		idempotencyKey: `${playerId}:provider-reconciliation-bonus`,
	});

	let providerBalanceMinor = 10_000_000;
	const provider = {
		async syncCatalogue() {
			throw new Error("Not used by this test");
		},
		async launchGame() {
			return {
				url: "https://games.example/real/session",
				externalSessionId: "provider-bonus-reconciliation-test",
				providerPlayerId: playerId,
				providerBalanceMinor,
				providerCurrencyCode: "USD",
			};
		},
		async getPlayerBalance(playerId: string) {
			return {
				playerId,
				balanceMinor: providerBalanceMinor,
				currencyCode: "USD",
			};
		},
	};

	const started = await startCurrentPlayerGame(
		{
			playerId,
			gameId,
			launchKey: crypto.randomUUID(),
		},
		provider,
	);
	providerBalanceMinor += 20_000;
	const closed = await closeCurrentPlayerGame(
		{ playerId, sessionId: started.sessionId },
		provider,
	);

	assert.equal(closed.kind, "provider");
	assert.equal(closed.netDeltaMinor, 20_000);
	assert.equal(closed.reconciliationApplied, true);
	const [storedAward] = await db
		.select()
		.from(bonusAward)
		.where(eq(bonusAward.id, activated.award.id));
	const [storedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	assert.equal(storedAward?.status, "completed");
	assert.equal(storedAward?.completedWagerMinor, 12_500);
	assert.equal(storedWallet?.cashBalanceMinor, 122_500);
	assert.equal(storedWallet?.bonusBalanceMinor, 0);

	const retried = await closeCurrentPlayerGame(
		{ playerId, sessionId: started.sessionId },
		provider,
	);
	assert.equal(retried.kind, "provider");
	assert.equal(retried.netDeltaMinor, 20_000);
	assert.equal(
		(
			await db
				.select()
				.from(walletOperation)
				.where(
					and(
						eq(walletOperation.walletId, storedWallet?.id ?? ""),
						eq(walletOperation.sourceId, started.sessionId),
					),
				)
		).filter((operation) => operation.type === "provider_reconciliation")
			.length,
		1,
	);
});
