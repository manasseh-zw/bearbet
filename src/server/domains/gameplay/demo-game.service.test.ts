import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { and, eq } from "drizzle-orm";

import { env } from "#/server/env";
import { db, pool } from "#/server/infra/db";
import {
	game,
	gameProvider,
	gameSession,
	player,
	user,
	wallet,
} from "#/server/infra/db/schema";

import { closeDemoGame, startDemoGame } from "./demo-game.service";

const playerId = `demo-session-test-${crypto.randomUUID()}`;
const gameId = `demo-game-${crypto.randomUUID()}`;

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
	await db.delete(wallet).where(eq(wallet.playerId, playerId));
	await db.delete(player).where(eq(player.userId, playerId));
	await db.delete(user).where(eq(user.id, playerId));
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
});
