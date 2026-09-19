import "@tanstack/react-start/server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import type { SetPlayerGameFavoriteInput } from "#/lib/schemas/game-engagement.schema";
import { env } from "#/server/env";
import { db } from "#/server/infra/db";
import type { DatabaseTransaction } from "#/server/infra/db/database.types";
import {
	game,
	playerFavoriteGame,
	playerRecentGame,
} from "#/server/infra/db/schema";
import { toNormalizedGame } from "#/server/domains/game/game.service";

export type PlayerGameEngagement = {
	favoriteGameIds: string[];
	favorites: ReturnType<typeof toNormalizedGame>[];
	recent: ReturnType<typeof toNormalizedGame>[];
};

export class GameEngagementServiceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GameEngagementServiceError";
	}
}

export async function getPlayerGameEngagement(
	playerId: string,
	limit = 8,
): Promise<PlayerGameEngagement> {
	const [favoriteIds, favoriteRows, recentRows] = await Promise.all([
		db
			.select({ externalId: game.externalId })
			.from(playerFavoriteGame)
			.innerJoin(game, eq(game.id, playerFavoriteGame.gameId))
			.where(eq(playerFavoriteGame.playerId, playerId))
			.orderBy(desc(playerFavoriteGame.createdAt)),
		db
			.select({ game })
			.from(playerFavoriteGame)
			.innerJoin(game, eq(game.id, playerFavoriteGame.gameId))
			.where(
				and(
					eq(playerFavoriteGame.playerId, playerId),
					eq(game.isAvailable, true),
					eq(game.isEnabled, true),
				),
			)
			.orderBy(desc(playerFavoriteGame.createdAt))
			.limit(limit),
		db
			.select({ game })
			.from(playerRecentGame)
			.innerJoin(game, eq(game.id, playerRecentGame.gameId))
			.where(
				and(
					eq(playerRecentGame.playerId, playerId),
					eq(game.isAvailable, true),
					eq(game.isEnabled, true),
				),
			)
			.orderBy(desc(playerRecentGame.lastPlayedAt))
			.limit(limit),
	]);

	return {
		favoriteGameIds: favoriteIds.map((row) => row.externalId),
		favorites: favoriteRows.map((row) => toNormalizedGame(row.game)),
		recent: recentRows.map((row) => toNormalizedGame(row.game)),
	};
}

export async function setPlayerGameFavorite(
	input: SetPlayerGameFavoriteInput & { playerId: string },
) {
	const [storedGame] = await db
		.select({
			id: game.id,
			isAvailable: game.isAvailable,
			isEnabled: game.isEnabled,
		})
		.from(game)
		.where(
			and(
				eq(game.providerId, env.CASINO_PROVIDER),
				eq(game.externalId, input.gameId.trim()),
			),
		);
	if (!storedGame && input.isFavorite) {
		throw new GameEngagementServiceError("This game is unavailable");
	}
	if (!storedGame) {
		return { isFavorite: false, gameId: input.gameId.trim() };
	}
	if (input.isFavorite && (!storedGame.isAvailable || !storedGame.isEnabled)) {
		throw new GameEngagementServiceError("This game is unavailable");
	}

	if (input.isFavorite) {
		await db
			.insert(playerFavoriteGame)
			.values({ playerId: input.playerId, gameId: storedGame.id })
			.onConflictDoNothing();
	} else {
		await db
			.delete(playerFavoriteGame)
			.where(
				and(
					eq(playerFavoriteGame.playerId, input.playerId),
					eq(playerFavoriteGame.gameId, storedGame.id),
				),
			);
	}

	return { isFavorite: input.isFavorite, gameId: input.gameId.trim() };
}

export async function recordPlayerGameLaunchInTransaction(
	transaction: DatabaseTransaction,
	input: { playerId: string; gameId: string; now?: Date },
) {
	const now = input.now ?? new Date();
	await transaction
		.insert(playerRecentGame)
		.values({
			playerId: input.playerId,
			gameId: input.gameId,
			lastPlayedAt: now,
		})
		.onConflictDoUpdate({
			target: [playerRecentGame.playerId, playerRecentGame.gameId],
			set: {
				lastPlayedAt: now,
				playCount: sql`${playerRecentGame.playCount} + 1`,
				updatedAt: now,
			},
		});
}
