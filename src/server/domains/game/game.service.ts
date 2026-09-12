import "@tanstack/react-start/server-only";

import { and, asc, eq, notInArray } from "drizzle-orm";
import { env } from "#/server/env";
import { db } from "#/server/infra/db";
import { game, gameProvider } from "#/server/infra/db/schema";
import { createCasinoProvider } from "#/server/infra/providers";
import type {
	CasinoProvider,
	NormalizedGame,
} from "#/server/infra/providers/provider.types";

export async function syncGameCatalogue(input: {
	integrationProvider: string;
	provider?: CasinoProvider;
	now?: Date;
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

		for (const candidate of games) {
			const values = toGameRecord(integrationProvider, candidate, now);
			await transaction
				.insert(game)
				.values(values)
				.onConflictDoUpdate({
					target: [game.providerId, game.externalId],
					set: { ...values, updatedAt: now },
				});
		}
	});

	return { gameCount: games.length, syncedAt: now };
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

function toNormalizedGame(stored: typeof game.$inferSelect): NormalizedGame {
	return {
		id: stored.externalId,
		...(stored.code ? { code: stored.code } : {}),
		name: stored.name,
		provider: stored.contentProvider,
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
