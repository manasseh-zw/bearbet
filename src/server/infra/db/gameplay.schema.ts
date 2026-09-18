import { relations, sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	bigint,
	check,
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { bonusAward } from "./bonus.schema";
import { player } from "./player.schema";
import { walletOperation } from "./wallet.schema";

export const gameSessionMode = pgEnum("game_session_mode", ["fun", "real"]);
export const gameSessionStatus = pgEnum("game_session_status", [
	"active",
	"closed",
	"error",
]);
export const gameRoundStatus = pgEnum("game_round_status", [
	"open",
	"settled",
	"refunded",
]);
export const providerOperationType = pgEnum("provider_operation_type", [
	"bet",
	"win",
	"refund",
]);
export const providerOperationStatus = pgEnum("provider_operation_status", [
	"accepted",
	"partially_refunded",
	"refunded",
]);

export const gameSession = pgTable(
	"game_session",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "restrict" }),
		integrationProvider: varchar("integration_provider", {
			length: 40,
		}).notNull(),
		externalSessionId: text("external_session_id").notNull(),
		gameId: text("game_id").notNull(),
		mode: gameSessionMode("mode").default("real").notNull(),
		currencyCode: varchar("currency_code", { length: 3 }).notNull(),
		launchUrl: text("launch_url"),
		providerPlayerId: text("provider_player_id"),
		providerBalanceBeforeMinor: bigint("provider_balance_before_minor", {
			mode: "number",
		}),
		providerBalanceAfterMinor: bigint("provider_balance_after_minor", {
			mode: "number",
		}),
		providerReconciledAt: timestamp("provider_reconciled_at", {
			withTimezone: true,
		}),
		status: gameSessionStatus("status").default("active").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		closedAt: timestamp("closed_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("game_session_provider_player_external_unique").on(
			table.integrationProvider,
			table.playerId,
			table.externalSessionId,
		),
		index("game_session_player_created_at_idx").on(
			table.playerId,
			table.createdAt,
		),
	],
);

export const gameRound = pgTable(
	"game_round",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => gameSession.id, { onDelete: "restrict" }),
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "restrict" }),
		integrationProvider: varchar("integration_provider", {
			length: 40,
		}).notNull(),
		externalRoundId: text("external_round_id").notNull(),
		gameId: text("game_id").notNull(),
		status: gameRoundStatus("status").default("open").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		settledAt: timestamp("settled_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("game_round_session_external_game_unique").on(
			table.sessionId,
			table.externalRoundId,
			table.gameId,
		),
		index("game_round_player_created_at_idx").on(
			table.playerId,
			table.createdAt,
		),
	],
);

export const providerOperation = pgTable(
	"provider_operation",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		roundId: uuid("round_id")
			.notNull()
			.references(() => gameRound.id, { onDelete: "restrict" }),
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "restrict" }),
		integrationProvider: varchar("integration_provider", {
			length: 40,
		}).notNull(),
		type: providerOperationType("type").notNull(),
		externalTransactionId: text("external_transaction_id").notNull(),
		fingerprint: text("fingerprint").notNull(),
		amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
		reportedBetAmountMinor: bigint("reported_bet_amount_minor", {
			mode: "number",
		}),
		cashAmountMinor: bigint("cash_amount_minor", { mode: "number" })
			.default(0)
			.notNull(),
		bonusAmountMinor: bigint("bonus_amount_minor", { mode: "number" })
			.default(0)
			.notNull(),
		wageringContributionMinor: bigint("wagering_contribution_minor", {
			mode: "number",
		})
			.default(0)
			.notNull(),
		refundedCashMinor: bigint("refunded_cash_minor", { mode: "number" })
			.default(0)
			.notNull(),
		refundedBonusMinor: bigint("refunded_bonus_minor", { mode: "number" })
			.default(0)
			.notNull(),
		bonusAwardId: uuid("bonus_award_id").references(() => bonusAward.id, {
			onDelete: "restrict",
		}),
		originalOperationId: uuid("original_operation_id").references(
			(): AnyPgColumn => providerOperation.id,
			{ onDelete: "restrict" },
		),
		walletOperationId: uuid("wallet_operation_id").references(
			() => walletOperation.id,
			{ onDelete: "restrict" },
		),
		status: providerOperationStatus("status").default("accepted").notNull(),
		response: jsonb("response").$type<Record<string, unknown>>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("provider_operation_idempotency_unique").on(
			table.integrationProvider,
			table.type,
			table.externalTransactionId,
		),
		index("provider_operation_round_type_idx").on(table.roundId, table.type),
		index("provider_operation_player_created_at_idx").on(
			table.playerId,
			table.createdAt,
		),
		index("provider_operation_original_idx").on(table.originalOperationId),
		check(
			"provider_operation_amounts_valid",
			sql`${table.amountMinor} >= 0 AND ${table.cashAmountMinor} >= 0 AND ${table.bonusAmountMinor} >= 0 AND ${table.cashAmountMinor} + ${table.bonusAmountMinor} = ${table.amountMinor} AND ${table.wageringContributionMinor} >= 0 AND ${table.refundedCashMinor} >= 0 AND ${table.refundedBonusMinor} >= 0 AND ${table.refundedCashMinor} <= ${table.cashAmountMinor} AND ${table.refundedBonusMinor} <= ${table.bonusAmountMinor}`,
		),
	],
);

export const gameSessionRelations = relations(gameSession, ({ many, one }) => ({
	player: one(player, {
		fields: [gameSession.playerId],
		references: [player.userId],
	}),
	rounds: many(gameRound),
}));

export const gameRoundRelations = relations(gameRound, ({ many, one }) => ({
	session: one(gameSession, {
		fields: [gameRound.sessionId],
		references: [gameSession.id],
	}),
	player: one(player, {
		fields: [gameRound.playerId],
		references: [player.userId],
	}),
	operations: many(providerOperation),
}));

export const providerOperationRelations = relations(
	providerOperation,
	({ one }) => ({
		round: one(gameRound, {
			fields: [providerOperation.roundId],
			references: [gameRound.id],
		}),
		player: one(player, {
			fields: [providerOperation.playerId],
			references: [player.userId],
		}),
		bonusAward: one(bonusAward, {
			fields: [providerOperation.bonusAwardId],
			references: [bonusAward.id],
		}),
		originalOperation: one(providerOperation, {
			fields: [providerOperation.originalOperationId],
			references: [providerOperation.id],
			relationName: "originalOperation",
		}),
		walletOperation: one(walletOperation, {
			fields: [providerOperation.walletOperationId],
			references: [walletOperation.id],
		}),
	}),
);

export type GameSession = typeof gameSession.$inferSelect;
export type GameRound = typeof gameRound.$inferSelect;
export type ProviderOperation = typeof providerOperation.$inferSelect;
