import { date, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth.schema";

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

export type Player = typeof player.$inferSelect;
