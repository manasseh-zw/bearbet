import { relations, sql } from "drizzle-orm";
import {
	bigint,
	check,
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
import { player } from "./player.schema";

export const withdrawalStatus = pgEnum("withdrawal_status", [
	"pending",
	"approved",
	"rejected",
]);

export const withdrawal = pgTable(
	"withdrawal",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		playerId: text("player_id")
			.notNull()
			.references(() => player.userId, { onDelete: "restrict" }),
		currencyCode: varchar("currency_code", { length: 3 }).notNull(),
		requestedAmountMinor: bigint("requested_amount_minor", {
			mode: "number",
		}).notNull(),
		reservedAmountMinor: bigint("reserved_amount_minor", {
			mode: "number",
		}).notNull(),
		status: withdrawalStatus("status").default("pending").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		reviewerUserId: text("reviewer_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),
		reviewReason: text("review_reason"),
		requestedAt: timestamp("requested_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("withdrawal_idempotency_key_unique").on(table.idempotencyKey),
		index("withdrawal_player_status_idx").on(table.playerId, table.status),
		index("withdrawal_status_requested_at_idx").on(
			table.status,
			table.requestedAt,
		),
		check(
			"withdrawal_amounts_positive_and_equal",
			sql`${table.requestedAmountMinor} > 0 AND ${table.reservedAmountMinor} = ${table.requestedAmountMinor}`,
		),
	],
);

export const withdrawalRelations = relations(withdrawal, ({ one }) => ({
	player: one(player, {
		fields: [withdrawal.playerId],
		references: [player.userId],
	}),
	reviewer: one(user, {
		fields: [withdrawal.reviewerUserId],
		references: [user.id],
	}),
}));

export type Withdrawal = typeof withdrawal.$inferSelect;
