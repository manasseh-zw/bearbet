import { relations, sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema";

export const adminAuditEntry = pgTable(
	"admin_audit_entry",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		actorUserId: text("actor_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		targetType: varchar("target_type", { length: 40 }).notNull(),
		targetId: text("target_id").notNull(),
		action: varchar("action", { length: 80 }).notNull(),
		reason: text("reason").notNull(),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.default(sql`'{}'::jsonb`)
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("admin_audit_actor_created_at_idx").on(
			table.actorUserId,
			table.createdAt,
		),
		index("admin_audit_target_created_at_idx").on(
			table.targetType,
			table.targetId,
			table.createdAt,
		),
		index("admin_audit_action_created_at_idx").on(
			table.action,
			table.createdAt,
		),
	],
);

export const adminAuditEntryRelations = relations(
	adminAuditEntry,
	({ one }) => ({
		actor: one(user, {
			fields: [adminAuditEntry.actorUserId],
			references: [user.id],
		}),
	}),
);

export type AdminAuditEntry = typeof adminAuditEntry.$inferSelect;
