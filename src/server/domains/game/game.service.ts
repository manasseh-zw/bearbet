import "@tanstack/react-start/server-only";

import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import {
	type CatalogueSearch,
	catalogueScopePriorityCategories,
	promotionCatalogueCategories,
} from "#/lib/schemas/catalogue.schema";
import { recordAuditEntryInTransaction } from "#/server/domains/audit/audit.service";
import { env } from "#/server/env";
import { db } from "#/server/infra/db";
import { game, gameProvider } from "#/server/infra/db/schema";
import { createCasinoProvider } from "#/server/infra/providers";
import type {
	CasinoProvider,
	NormalizedGame,
} from "#/server/infra/providers/provider.types";

const searchCache = new Map<
	string,
	{ expiresAt: number; value: CatalogueSearchResult }
>();
const searchCacheTtlMs = 30_000;
const searchCacheMaxEntries = 250;
const catalogueUpsertBatchSize = 250;

export function clearCatalogueSearchCache() {
	searchCache.clear();
}

export type CatalogueSearchResult = {
	games: NormalizedGame[];
	total: number;
	page: number;
	pageSize: number;
	pageCount: number;
	categories: Array<{ value: string; count: number }>;
};

export async function syncGameCatalogue(input: {
	integrationProvider: string;
	provider?: CasinoProvider;
	now?: Date;
	audit?: { actorUserId: string; reason: string };
}) {
	const provider = input.provider ?? createCasinoProvider();
	const catalogue = await provider.syncCatalogue();
	const now = input.now ?? new Date();
	const integrationProvider = normalizeProviderId(input.integrationProvider);
	const games = catalogue.games.map(normalizeGame);
	if (new Set(games.map((candidate) => candidate.id)).size !== games.length) {
		throw new Error("Provider catalogue contains duplicate game IDs");
	}

	await db.transaction(async (transaction) => {
		await transaction
			.insert(gameProvider)
			.values({
				id: integrationProvider,
				name: integrationProvider,
				lastSyncedAt: now,
			})
			.onConflictDoUpdate({
				target: gameProvider.id,
				set: { lastSyncedAt: now, updatedAt: now },
			});

		if (games.length > 0) {
			await transaction
				.update(game)
				.set({ isAvailable: false, updatedAt: now })
				.where(
					and(
						eq(game.providerId, integrationProvider),
						notInArray(
							game.externalId,
							games.map((candidate) => candidate.id),
						),
					),
				);
		} else {
			await transaction
				.update(game)
				.set({ isAvailable: false, updatedAt: now })
				.where(eq(game.providerId, integrationProvider));
		}

		const gameRecords = games.map((candidate) =>
			toGameRecord(integrationProvider, candidate, now),
		);
		for (
			let offset = 0;
			offset < gameRecords.length;
			offset += catalogueUpsertBatchSize
		) {
			const batch = gameRecords.slice(
				offset,
				offset + catalogueUpsertBatchSize,
			);
			await transaction
				.insert(game)
				.values(batch)
				.onConflictDoUpdate({
					target: [game.providerId, game.externalId],
					set: {
						code: sql.raw("excluded.code"),
						name: sql.raw("excluded.name"),
						contentProvider: sql.raw("excluded.content_provider"),
						// Provider metadata is authoritative; local curation fields below
						// are intentionally omitted so syncs preserve administrator choices.
						category: sql.raw("excluded.category"),
						type: sql.raw("excluded.type"),
						description: sql.raw("excluded.description"),
						rtp: sql.raw("excluded.rtp"),
						bannerUrl: sql.raw("excluded.banner_url"),
						coverUrl: sql.raw("excluded.cover_url"),
						supportsFun: sql.raw("excluded.supports_fun"),
						isAvailable: sql.raw("excluded.is_available"),
						isMobile: sql.raw("excluded.is_mobile"),
						hasFreeSpins: sql.raw("excluded.has_free_spins"),
						hasLobby: sql.raw("excluded.has_lobby"),
						hasTables: sql.raw("excluded.has_tables"),
						lastSeenAt: sql.raw("excluded.last_seen_at"),
						updatedAt: now,
					},
				});
		}

		if (input.audit) {
			await recordAuditEntryInTransaction(transaction, {
				actorUserId: input.audit.actorUserId,
				target: { type: "game", id: integrationProvider },
				action: "games_synced",
				reason: input.audit.reason,
				metadata: { integrationProvider, gameCount: games.length },
			});
		}
	});
	clearCatalogueSearchCache();

	return { gameCount: games.length, syncedAt: now };
}

export async function searchGames(
	input: CatalogueSearch,
	integrationProvider?: string,
): Promise<CatalogueSearchResult> {
	const providerId = normalizeProviderId(
		integrationProvider ?? env.CASINO_PROVIDER,
	);
	const query = normalizeSearchQuery(input.q);
	const cacheKey = JSON.stringify({ providerId, ...input, q: query });
	const cached = searchCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.value;
	if (cached) searchCache.delete(cacheKey);

	const scopeCondition =
		input.scope === "promotions"
			? sql`${game.category} in (${sql.join(
					promotionCatalogueCategories.map((category) => sql`${category}`),
					sql`, `,
				)})`
			: sql`true`;
	const categoryCondition = input.category
		? sql`${game.category} = ${input.category}`
		: sql`true`;
	const escapedQuery = escapeLike(query);
	const searchCondition = query
		? sql`(
			lower(${game.name}) like ${`%${escapedQuery}%`} escape '\'
			or lower(${game.contentProvider}) like ${`%${escapedQuery}%`} escape '\'
			or lower(coalesce(${game.category}, '')) like ${`%${escapedQuery}%`} escape '\'
			or lower(${game.name}) % ${query}
			or lower(${game.contentProvider}) % ${query}
			or lower(coalesce(${game.category}, '')) % ${query}
		)`
		: sql`true`;
	const baseCondition = sql`
		${game.providerId} = ${providerId}
		and ${game.isAvailable} = true
		and ${game.isEnabled} = true
		and ${scopeCondition}
		and ${categoryCondition}
		and ${searchCondition}
	`;
	const offset = (input.page - 1) * input.pageSize;
	const scopePriority = catalogueScopePriorityCategories[input.scope];
	const priorityOrder = sql`case ${sql.join(
		scopePriority.map(
			(category, index) =>
				sql`when ${game.category} = ${category} then ${index}`,
		),
		sql` `,
	)} else ${scopePriority.length} end`;
	const rank = query
		? sql`greatest(
			similarity(lower(${game.name}), ${query}),
			similarity(lower(${game.contentProvider}), ${query}),
			similarity(lower(coalesce(${game.category}, '')), ${query})
		)`
		: sql`0`;

	const [rows, totals, categoryRows] = await Promise.all([
		db
			.select()
			.from(game)
			.where(baseCondition)
			.orderBy(
				...(query
					? [
							sql`lower(${game.name}) = ${query} desc`,
							sql`lower(${game.name}) like ${`${escapedQuery}%`} desc`,
							sql`${rank} desc`,
							asc(game.name),
						]
					: [priorityOrder, asc(game.name), asc(game.externalId)]),
			)
			.limit(input.pageSize)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(game)
			.where(baseCondition),
		db
			.select({
				value: game.category,
				count: sql<number>`count(*)::int`,
			})
			.from(game)
			.where(sql`
				${game.providerId} = ${providerId}
				and ${game.isAvailable} = true
				and ${game.isEnabled} = true
				and ${scopeCondition}
				and ${searchCondition}
			`)
			.groupBy(game.category)
			.orderBy(sql`count(*) desc`, asc(game.category)),
	]);

	const total = totals[0]?.count ?? 0;
	const value: CatalogueSearchResult = {
		games: rows.map(toNormalizedGame),
		total,
		page: input.page,
		pageSize: input.pageSize,
		pageCount: Math.ceil(total / input.pageSize),
		categories: categoryRows.map((row) => ({
			value: row.value?.trim() || "Other",
			count: row.count,
		})),
	};
	setSearchCache(cacheKey, value);
	return value;
}

function normalizeSearchQuery(value: string) {
	return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function escapeLike(value: string) {
	return value.replace(/[\\%_]/g, "\\$&");
}

function setSearchCache(key: string, value: CatalogueSearchResult) {
	if (searchCache.size >= searchCacheMaxEntries) {
		const oldest = searchCache.keys().next().value;
		if (oldest) searchCache.delete(oldest);
	}
	searchCache.set(key, { expiresAt: Date.now() + searchCacheTtlMs, value });
}

export async function listGames(integrationProvider?: string) {
	const providerId = normalizeProviderId(
		integrationProvider ?? env.CASINO_PROVIDER,
	);
	const rows = await db
		.select()
		.from(game)
		.where(eq(game.providerId, providerId))
		.orderBy(asc(game.name), asc(game.externalId));
	return rows.map(toNormalizedGame);
}

export async function findGame(
	integrationProvider: string,
	externalId: string,
) {
	const [stored] = await db
		.select()
		.from(game)
		.where(
			and(
				eq(game.providerId, normalizeProviderId(integrationProvider)),
				eq(game.externalId, externalId),
			),
		);
	return stored ? toNormalizedGame(stored) : undefined;
}

export async function findStoredGame(
	integrationProvider: string,
	externalId: string,
) {
	const [stored] = await db
		.select()
		.from(game)
		.where(
			and(
				eq(game.providerId, normalizeProviderId(integrationProvider)),
				eq(game.externalId, externalId),
			),
		);
	return stored;
}

function normalizeProviderId(value: string) {
	const providerId = value.trim().toLowerCase();
	if (!/^[a-z0-9_-]{1,40}$/.test(providerId)) {
		throw new Error("Integration provider ID is invalid");
	}
	return providerId;
}

function normalizeGame(candidate: NormalizedGame): NormalizedGame {
	const id = candidate.id.trim();
	const name = candidate.name.trim();
	const provider = candidate.provider.trim();
	if (!id || !name || !provider) {
		throw new Error("Provider catalogue contains an invalid game");
	}
	return {
		...candidate,
		id,
		name,
		provider,
		...(candidate.code?.trim() ? { code: candidate.code.trim() } : {}),
		...(candidate.category?.trim()
			? { category: candidate.category.trim() }
			: {}),
		...(candidate.type?.trim()
			? { type: candidate.type.trim().toLowerCase() }
			: {}),
		...(candidate.description?.trim()
			? { description: candidate.description.trim() }
			: {}),
	};
}

function toGameRecord(
	providerId: string,
	candidate: NormalizedGame,
	now: Date,
) {
	return {
		providerId,
		externalId: candidate.id,
		code: candidate.code,
		name: candidate.name,
		contentProvider: candidate.provider,
		category: candidate.category,
		type: candidate.type,
		description: candidate.description,
		rtp: candidate.rtp,
		bannerUrl: candidate.bannerUrl,
		coverUrl: candidate.coverUrl,
		supportsFun: candidate.supportsFun,
		isAvailable: candidate.isAvailable,
		isMobile: candidate.isMobile,
		hasFreeSpins: candidate.hasFreeSpins,
		hasLobby: candidate.hasLobby,
		hasTables: candidate.hasTables,
		lastSeenAt: now,
	};
}

export function toNormalizedGame(
	stored: typeof game.$inferSelect,
): NormalizedGame {
	return {
		id: stored.externalId,
		...(stored.code ? { code: stored.code } : {}),
		name: stored.name,
		provider: stored.contentProvider,
		...(stored.category ? { category: stored.category } : {}),
		...(stored.type ? { type: stored.type } : {}),
		...(stored.description ? { description: stored.description } : {}),
		...(stored.rtp !== null ? { rtp: stored.rtp } : {}),
		...(stored.bannerUrl ? { bannerUrl: stored.bannerUrl } : {}),
		...(stored.coverUrl ? { coverUrl: stored.coverUrl } : {}),
		supportsFun: stored.supportsFun,
		isAvailable: stored.isAvailable && stored.isEnabled,
		isMobile: stored.isMobile,
		hasFreeSpins: stored.hasFreeSpins,
		hasLobby: stored.hasLobby,
		hasTables: stored.hasTables,
	};
}
