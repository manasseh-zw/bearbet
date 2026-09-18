import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const gameProvider = pgTable("game_provider", {
	id: varchar("id", { length: 40 }).primaryKey(),
	name: varchar("name", { length: 120 }).notNull(),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const game = pgTable(
	"game",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		providerId: varchar("provider_id", { length: 40 })
			.notNull()
			.references(() => gameProvider.id, { onDelete: "restrict" }),
		externalId: text("external_id").notNull(),
		code: text("code"),
		name: text("name").notNull(),
		contentProvider: text("content_provider").notNull(),
		category: text("category"),
		type: text("type"),
		description: text("description"),
		rtp: real("rtp"),
		bannerUrl: text("banner_url"),
		coverUrl: text("cover_url"),
		supportsFun: boolean("supports_fun").notNull(),
		isAvailable: boolean("is_available").notNull(),
		isEnabled: boolean("is_enabled").default(true).notNull(),
		isFeatured: boolean("is_featured").default(false).notNull(),
		isMobile: boolean("is_mobile").notNull(),
		hasFreeSpins: boolean("has_free_spins").notNull(),
		hasLobby: boolean("has_lobby").notNull(),
		hasTables: boolean("has_tables").notNull(),
		lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("game_provider_external_unique").on(
			table.providerId,
			table.externalId,
		),
		index("game_provider_available_idx").on(
			table.providerId,
			table.isAvailable,
		),
		index("game_content_provider_idx").on(table.contentProvider),
		index("game_type_idx").on(table.type),
		check(
			"game_rtp_non_negative",
			sql`${table.rtp} IS NULL OR ${table.rtp} >= 0`,
		),
	],
);

export const gameProviderRelations = relations(gameProvider, ({ many }) => ({
	games: many(game),
}));

export const gameRelations = relations(game, ({ one }) => ({
	provider: one(gameProvider, {
		fields: [game.providerId],
		references: [gameProvider.id],
	}),
}));
