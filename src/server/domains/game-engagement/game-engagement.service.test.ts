import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { and, eq } from "drizzle-orm";

import { env } from "#/server/env";
import { db, pool } from "#/server/infra/db";
import {
	game,
	gameProvider,
	player,
	playerFavoriteGame,
	playerRecentGame,
	user,
} from "#/server/infra/db/schema";

import {
	getPlayerGameEngagement,
	recordPlayerGameLaunchInTransaction,
	setPlayerGameFavorite,
} from "./game-engagement.service";

const playerId = `engagement-test-${crypto.randomUUID()}`;
let gameId: string;

before(async () => {
	await db
		.insert(gameProvider)
		.values({ id: env.CASINO_PROVIDER, name: env.CASINO_PROVIDER })
		.onConflictDoNothing();
	await db.insert(user).values({
		id: playerId,
		name: "Engagement Test Player",
		email: `${playerId}@bearbet.test`,
	});
	await db.insert(player).values({
		userId: playerId,
		firstName: "Engagement",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	const [created] = await db
		.insert(game)
		.values({
			providerId: env.CASINO_PROVIDER,
			externalId: `engagement-game-${crypto.randomUUID()}`,
			name: "Engagement test game",
			contentProvider: "BearBet",
			category: "Slots",
			type: "slots",
			supportsFun: true,
			isAvailable: true,
			isMobile: true,
			hasFreeSpins: false,
			hasLobby: false,
			hasTables: false,
			lastSeenAt: new Date(),
		})
		.returning({ id: game.id });
	gameId = created.id;
});

after(async () => {
	await db
		.delete(playerFavoriteGame)
		.where(eq(playerFavoriteGame.playerId, playerId));
	await db
		.delete(playerRecentGame)
		.where(eq(playerRecentGame.playerId, playerId));
	await db.delete(game).where(eq(game.id, gameId));
	await db.delete(player).where(eq(player.userId, playerId));
	await db.delete(user).where(eq(user.id, playerId));
	await pool.end();
});

test("favorites are retry-safe and launches build a recent projection", async () => {
	const storedGame = await db
		.select({ externalId: game.externalId })
		.from(game)
		.where(eq(game.id, gameId));
	const externalId = storedGame[0]?.externalId;
	assert.ok(externalId);

	assert.deepEqual(
		await setPlayerGameFavorite({
			playerId,
			gameId: externalId,
			isFavorite: true,
		}),
		{ isFavorite: true, gameId: externalId },
	);
	await setPlayerGameFavorite({
		playerId,
		gameId: externalId,
		isFavorite: true,
	});

	await db.transaction(async (transaction) => {
		await recordPlayerGameLaunchInTransaction(transaction, {
			playerId,
			gameId,
			now: new Date("2030-01-01T00:00:00.000Z"),
		});
		await recordPlayerGameLaunchInTransaction(transaction, {
			playerId,
			gameId,
			now: new Date("2030-01-02T00:00:00.000Z"),
		});
	});

	const engagement = await getPlayerGameEngagement(playerId);
	assert.deepEqual(engagement.favoriteGameIds, [externalId]);
	assert.equal(engagement.favorites[0]?.id, externalId);
	assert.equal(engagement.recent[0]?.id, externalId);

	await setPlayerGameFavorite({
		playerId,
		gameId: externalId,
		isFavorite: false,
	});
	assert.deepEqual(
		(await getPlayerGameEngagement(playerId)).favoriteGameIds,
		[],
	);

	const [recent] = await db
		.select({ playCount: playerRecentGame.playCount })
		.from(playerRecentGame)
		.where(
			and(
				eq(playerRecentGame.playerId, playerId),
				eq(playerRecentGame.gameId, gameId),
			),
		);
	assert.equal(recent?.playCount, 2);
});
