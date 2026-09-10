import { relations, sql } from "drizzle-orm";
import {
	bigint,
	check,
	date,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema";

export const walletBucket = pgEnum("wallet_bucket", [
	"cash",
	"bonus",
	"reserved_cash",
]);

export const ledgerEntryType = pgEnum("ledger_entry_type", [
	"welcome_credit",
	"demo_top_up",
	"bet",
	"win",
	"refund",
	"withdrawal_reserve",
	"withdrawal_release",
	"withdrawal_debit",
	"bonus_credit",
	"bonus_conversion",
	"admin_adjustment",
]);

export const player = pgTable("player", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "restrict" }),
	firstName: varchar("first_name", { length: 80 }).notNull(),
	lastName: varchar("last_name", { length: 80 }).notNull(),
	dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
	countryCode: varchar("country_code", { length: 2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const wallet = pgTable(
	"wallet",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "restrict" }),
		currencyCode: varchar("currency_code", { length: 3 }).notNull(),
		cashBalanceMinor: bigint("cash_balance_minor", { mode: "number" })
			.default(0)
			.notNull(),
		bonusBalanceMinor: bigint("bonus_balance_minor", { mode: "number" })
			.default(0)
			.notNull(),
		reservedCashMinor: bigint("reserved_cash_minor", { mode: "number" })
			.default(0)
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("wallet_player_id_unique").on(table.playerId),
		check(
			"wallet_cash_balance_non_negative",
			sql`${table.cashBalanceMinor} >= 0`,
		),
		check(
			"wallet_bonus_balance_non_negative",
			sql`${table.bonusBalanceMinor} >= 0`,
		),
		check(
			"wallet_reserved_cash_non_negative",
			sql`${table.reservedCashMinor} >= 0`,
		),
	],
);

export const ledgerEntry = pgTable(
	"ledger_entry",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		walletId: uuid("wallet_id")
			.notNull()
			.references(() => wallet.id, { onDelete: "restrict" }),
		bucket: walletBucket("bucket").notNull(),
		type: ledgerEntryType("type").notNull(),
		amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
		balanceBeforeMinor: bigint("balance_before_minor", {
			mode: "number",
		}).notNull(),
		balanceAfterMinor: bigint("balance_after_minor", {
			mode: "number",
		}).notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		sourceType: text("source_type"),
		sourceId: text("source_id"),
		actorUserId: text("actor_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("ledger_entry_idempotency_key_unique").on(table.idempotencyKey),
		index("ledger_entry_wallet_created_at_idx").on(
			table.walletId,
			table.createdAt,
		),
		check(
			"ledger_entry_balance_equation",
			sql`${table.balanceAfterMinor} = ${table.balanceBeforeMinor} + ${table.amountMinor}`,
		),
	],
);

export const playerRelations = relations(player, ({ one }) => ({
	user: one(user, {
		fields: [player.userId],
		references: [user.id],
	}),
	wallet: one(wallet),
}));

export const walletRelations = relations(wallet, ({ many, one }) => ({
	player: one(player, {
		fields: [wallet.playerId],
		references: [player.userId],
	}),
	ledgerEntries: many(ledgerEntry),
}));

export const ledgerEntryRelations = relations(ledgerEntry, ({ one }) => ({
	wallet: one(wallet, {
		fields: [ledgerEntry.walletId],
		references: [wallet.id],
	}),
	actor: one(user, {
		fields: [ledgerEntry.actorUserId],
		references: [user.id],
	}),
}));

export type Player = typeof player.$inferSelect;
export type Wallet = typeof wallet.$inferSelect;
export type LedgerEntry = typeof ledgerEntry.$inferSelect;
