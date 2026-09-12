import { relations, sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { player } from "./player.schema";
import { walletOperation } from "./wallet.schema";

export const bonusDefinitionType = pgEnum("bonus_definition_type", [
	"welcome",
	"deposit",
	"promotional",
]);

export const bonusAwardStatus = pgEnum("bonus_award_status", [
	"active",
	"completed",
	"exhausted",
	"expired",
	"cancelled",
]);

export const bonusDefinition = pgTable(
	"bonus_definition",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		code: varchar("code", { length: 64 }).notNull(),
		name: varchar("name", { length: 120 }).notNull(),
		description: text("description"),
		type: bonusDefinitionType("type").notNull(),
		amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
		wageringMultiplier: integer("wagering_multiplier").notNull(),
		expiresAfterDays: integer("expires_after_days").notNull(),
		minimumDepositMinor: bigint("minimum_deposit_minor", {
			mode: "number",
		}),
		maximumAwardMinor: bigint("maximum_award_minor", { mode: "number" }),
		eligibleGameIds: jsonb("eligible_game_ids")
			.$type<string[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		eligibleCategories: jsonb("eligible_categories")
			.$type<string[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		eligibleProviders: jsonb("eligible_providers")
			.$type<string[]>()
			.default(sql`'[]'::jsonb`)
			.notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("bonus_definition_code_unique").on(table.code),
		check("bonus_definition_amount_positive", sql`${table.amountMinor} > 0`),
		check(
			"bonus_definition_multiplier_positive",
			sql`${table.wageringMultiplier} > 0`,
		),
		check(
			"bonus_definition_expiry_positive",
			sql`${table.expiresAfterDays} > 0`,
		),
		check(
			"bonus_definition_deposit_non_negative",
			sql`${table.minimumDepositMinor} IS NULL OR ${table.minimumDepositMinor} >= 0`,
		),
		check(
			"bonus_definition_maximum_positive",
			sql`${table.maximumAwardMinor} IS NULL OR ${table.maximumAwardMinor} > 0`,
		),
	],
);

export const bonusAward = pgTable(
	"bonus_award",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		definitionId: uuid("definition_id")
			.notNull()
			.references(() => bonusDefinition.id, { onDelete: "restrict" }),
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "restrict" }),
		qualifyingDepositOperationId: uuid(
			"qualifying_deposit_operation_id",
		).references(() => walletOperation.id, { onDelete: "restrict" }),
		status: bonusAwardStatus("status").default("active").notNull(),
		awardedAmountMinor: bigint("awarded_amount_minor", {
			mode: "number",
		}).notNull(),
		bonusBalanceMinor: bigint("bonus_balance_minor", {
			mode: "number",
		}).notNull(),
		requiredWagerMinor: bigint("required_wager_minor", {
			mode: "number",
		}).notNull(),
		completedWagerMinor: bigint("completed_wager_minor", {
			mode: "number",
		})
			.default(0)
			.notNull(),
		eligibleGameIds: jsonb("eligible_game_ids").$type<string[]>().notNull(),
		eligibleCategories: jsonb("eligible_categories")
			.$type<string[]>()
			.notNull(),
		eligibleProviders: jsonb("eligible_providers").$type<string[]>().notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		exhaustedAt: timestamp("exhausted_at", { withTimezone: true }),
		expiredAt: timestamp("expired_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("bonus_award_idempotency_key_unique").on(table.idempotencyKey),
		uniqueIndex("bonus_award_player_definition_unique").on(
			table.playerId,
			table.definitionId,
		),
		uniqueIndex("bonus_award_qualifying_deposit_unique").on(
			table.qualifyingDepositOperationId,
		),
		uniqueIndex("bonus_award_one_active_per_player")
			.on(table.playerId)
			.where(sql`${table.status} = 'active'`),
		index("bonus_award_player_status_idx").on(table.playerId, table.status),
		check(
			"bonus_award_amounts_valid",
			sql`${table.awardedAmountMinor} > 0 AND ${table.bonusBalanceMinor} >= 0 AND ${table.requiredWagerMinor} > 0 AND ${table.completedWagerMinor} >= 0 AND ${table.completedWagerMinor} <= ${table.requiredWagerMinor}`,
		),
	],
);

export const bonusDefinitionRelations = relations(
	bonusDefinition,
	({ many }) => ({ awards: many(bonusAward) }),
);

export const bonusAwardRelations = relations(bonusAward, ({ one }) => ({
	definition: one(bonusDefinition, {
		fields: [bonusAward.definitionId],
		references: [bonusDefinition.id],
	}),
	player: one(player, {
		fields: [bonusAward.playerId],
		references: [player.userId],
	}),
}));

export type BonusDefinition = typeof bonusDefinition.$inferSelect;
export type BonusAward = typeof bonusAward.$inferSelect;
