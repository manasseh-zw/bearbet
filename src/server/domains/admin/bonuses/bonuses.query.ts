import "@tanstack/react-start/server-only";

import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import {
	type AdminBonusQuery,
	adminBonusQuerySchema,
} from "#/lib/schemas/admin-bonus.schema";
import { db } from "#/server/infra/db";
import { bonusDefinition } from "#/server/infra/db/schema";

export async function listAdminBonusDefinitions(input: AdminBonusQuery) {
	const query = adminBonusQuerySchema.parse(input);
	const conditions: SQL[] = [];

	if (query.search) {
		const search = `%${query.search}%`;
		const searchCondition = or(
			ilike(bonusDefinition.code, search),
			ilike(bonusDefinition.name, search),
			ilike(bonusDefinition.description, search),
		);
		if (searchCondition) conditions.push(searchCondition);
	}
	if (query.status !== "all") {
		conditions.push(eq(bonusDefinition.isActive, query.status === "active"));
	}
	if (query.type !== "all") {
		conditions.push(eq(bonusDefinition.type, query.type));
	}

	const where = conditions.length ? and(...conditions) : undefined;
	const [totalResult] = await db
		.select({ value: count() })
		.from(bonusDefinition)
		.where(where);
	const total = totalResult?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
	const page = Math.min(query.page, totalPages);

	const sortColumn = {
		name: bonusDefinition.name,
		createdAt: bonusDefinition.createdAt,
		updatedAt: bonusDefinition.updatedAt,
	}[query.sort];
	const direction = query.direction === "asc" ? asc : desc;
	const rows = await db
		.select()
		.from(bonusDefinition)
		.where(where)
		.orderBy(direction(sortColumn), direction(bonusDefinition.id))
		.limit(query.pageSize)
		.offset((page - 1) * query.pageSize);

	return {
		items: rows,
		pagination: { page, pageSize: query.pageSize, total, totalPages },
	};
}
