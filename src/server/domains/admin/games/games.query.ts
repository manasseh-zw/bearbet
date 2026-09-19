import "@tanstack/react-start/server-only";

import { and, asc, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";

import type { AdminGameQuery } from "#/lib/schemas/admin-game.schema";
import { adminGameQuerySchema } from "#/lib/schemas/admin-game.schema";
import { env } from "#/server/env";
import { db } from "#/server/infra/db";
import { game } from "#/server/infra/db/schema";

export async function listAdminGames(input: AdminGameQuery) {
	const query = adminGameQuerySchema.parse(input);
	const conditions: SQL[] = [eq(game.providerId, env.CASINO_PROVIDER)];

	if (query.search) {
		const pattern = `%${query.search}%`;
		conditions.push(
			or(
				ilike(game.name, pattern),
				ilike(game.externalId, pattern),
				ilike(game.contentProvider, pattern),
				ilike(game.category, pattern),
			) as SQL,
		);
	}
	if (query.provider) conditions.push(eq(game.contentProvider, query.provider));
	if (query.availability === "available")
		conditions.push(eq(game.isAvailable, true));
	if (query.availability === "unavailable")
		conditions.push(eq(game.isAvailable, false));
	if (query.status === "enabled") conditions.push(eq(game.isEnabled, true));
	if (query.status === "disabled") conditions.push(eq(game.isEnabled, false));
	if (query.curation === "featured") conditions.push(eq(game.isFeatured, true));
	if (query.curation === "popular") conditions.push(eq(game.isPopular, true));
	if (query.curation === "new") conditions.push(eq(game.isNew, true));

	const where = and(...conditions);
	const orderColumn = {
		name: game.name,
		lastSeenAt: game.lastSeenAt,
		updatedAt: game.updatedAt,
	}[query.sort];
	const orderDirection = query.direction === "asc" ? asc : desc;

	const [rows, totalRows, providers, categories] = await Promise.all([
		db
			.select()
			.from(game)
			.where(where)
			.orderBy(orderDirection(orderColumn), asc(game.externalId))
			.limit(query.pageSize)
			.offset((query.page - 1) * query.pageSize),
		db.select({ value: sql<number>`count(*)::int` }).from(game).where(where),
		db
			.selectDistinct({ value: game.contentProvider })
			.from(game)
			.where(eq(game.providerId, env.CASINO_PROVIDER))
			.orderBy(asc(game.contentProvider)),
		db
			.selectDistinct({ value: game.category })
			.from(game)
			.where(eq(game.providerId, env.CASINO_PROVIDER))
			.orderBy(asc(game.category)),
	]);

	const total = totalRows[0]?.value ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / query.pageSize));

	return {
		items: rows,
		filters: {
			providers: providers.flatMap((row) => (row.value ? [row.value] : [])),
			categories: categories.flatMap((row) => (row.value ? [row.value] : [])),
		},
		pagination: {
			page: Math.min(query.page, pageCount),
			pageSize: query.pageSize,
			total,
			totalPages: pageCount,
		},
	};
}
