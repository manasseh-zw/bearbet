import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { game } from "./game.schema";
import { player } from "./player.schema";

export const playerFavoriteGame = pgTable(
	"player_favorite_game",
	{
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "cascade" }),
		gameId: uuid("game_id")
			.notNull()
			.references(() => game.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.playerId, table.gameId],
			name: "player_favorite_game_pk",
		}),
		index("player_favorite_game_player_created_at_idx").on(
			table.playerId,
			table.createdAt,
		),
		index("player_favorite_game_game_idx").on(table.gameId),
	],
);

export const playerRecentGame = pgTable(
	"player_recent_game",
	{
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "cascade" }),
		gameId: uuid("game_id")
			.notNull()
			.references(() => game.id, { onDelete: "cascade" }),
		lastPlayedAt: timestamp("last_played_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		playCount: integer("play_count").default(1).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.playerId, table.gameId],
			name: "player_recent_game_pk",
		}),
		index("player_recent_game_player_last_played_idx").on(
			table.playerId,
			table.lastPlayedAt,
		),
		index("player_recent_game_game_idx").on(table.gameId),
		check(
			"player_recent_game_play_count_positive",
			sql`${table.playCount} > 0`,
		),
	],
);

export const playerFavoriteGameRelations = relations(
	playerFavoriteGame,
	({ one }) => ({
		player: one(player, {
			fields: [playerFavoriteGame.playerId],
			references: [player.userId],
		}),
		game: one(game, {
			fields: [playerFavoriteGame.gameId],
			references: [game.id],
		}),
	}),
);

export const playerRecentGameRelations = relations(
	playerRecentGame,
	({ one }) => ({
		player: one(player, {
			fields: [playerRecentGame.playerId],
			references: [player.userId],
		}),
		game: one(game, {
			fields: [playerRecentGame.gameId],
			references: [game.id],
		}),
	}),
);

export type PlayerFavoriteGame = typeof playerFavoriteGame.$inferSelect;
export type PlayerRecentGame = typeof playerRecentGame.$inferSelect;
