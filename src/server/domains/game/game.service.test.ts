import assert from "node:assert/strict";
import { after, test } from "node:test";

import { and, eq } from "drizzle-orm";
import {
	findGame,
	listGames,
	searchGames,
	syncGameCatalogue,
} from "#/server/domains/game/game.service";
import { db, pool } from "#/server/infra/db";
import { game, gameProvider } from "#/server/infra/db/schema";
import type { CasinoProvider } from "#/server/infra/providers/provider.types";

const integrationProvider = `test_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;

after(async () => {
	await db.delete(game).where(eq(game.providerId, integrationProvider));
	await db.delete(gameProvider).where(eq(gameProvider.id, integrationProvider));
	await pool.end();
});

test("catalogue sync persists provider games and marks missing games unavailable", async () => {
	const initialProvider: CasinoProvider = {
		async syncCatalogue() {
			return {
				games: [
					{
						id: "game-1",
						name: "Fixture game",
						provider: "fixture-studio",
						type: "slots",
						supportsFun: true,
						isAvailable: true,
						isMobile: true,
						hasFreeSpins: false,
						hasLobby: false,
						hasTables: false,
					},
					{
						id: "game-2",
						name: "Retired game",
						provider: "fixture-studio",
						type: "slots",
						supportsFun: true,
						isAvailable: true,
						isMobile: true,
						hasFreeSpins: false,
						hasLobby: false,
						hasTables: false,
					},
				],
			};
		},
		async launchGame() {
			throw new Error("Not used by this test");
		},
	};

	const first = await syncGameCatalogue({
		integrationProvider,
		provider: initialProvider,
		now: new Date("2030-01-01T00:00:00Z"),
	});
	assert.equal(first.gameCount, 2);
	assert.equal((await listGames(integrationProvider)).length, 2);

	const updatedProvider: CasinoProvider = {
		...initialProvider,
		async syncCatalogue() {
			return {
				games: [
					{
						id: "game-1",
						name: "Renamed game",
						provider: "updated-studio",
						category: "Playtech",
						type: "roulette",
						supportsFun: true,
						isAvailable: true,
						isMobile: true,
						hasFreeSpins: false,
						hasLobby: false,
						hasTables: false,
					},
					{
						id: "game-booming",
						name: "Zulu Booming game",
						provider: "updated-studio",
						category: "Booming",
						type: "slots",
						supportsFun: true,
						isAvailable: true,
						isMobile: true,
						hasFreeSpins: false,
						hasLobby: false,
						hasTables: false,
					},
					{
						id: "game-pragmatic",
						name: "Alpha Pragmatic game",
						provider: "updated-studio",
						category: "Pragmatic",
						type: "slots",
						supportsFun: true,
						isAvailable: true,
						isMobile: true,
						hasFreeSpins: false,
						hasLobby: false,
						hasTables: false,
					},
				],
			};
		},
	};
	await syncGameCatalogue({
		integrationProvider,
		provider: updatedProvider,
		now: new Date("2030-01-02T00:00:00Z"),
	});
	await db
		.update(game)
		.set({ category: "Admin curated" })
		.where(
			and(
				eq(game.providerId, integrationProvider),
				eq(game.externalId, "game-1"),
			),
		);
	await syncGameCatalogue({
		integrationProvider,
		provider: updatedProvider,
		now: new Date("2030-01-03T00:00:00Z"),
	});

	const games = await listGames(integrationProvider);
	assert.equal(games.length, 4);
	assert.equal(
		games.find((candidate) => candidate.id === "game-1")?.name,
		"Renamed game",
	);
	assert.equal(
		games.find((candidate) => candidate.id === "game-2")?.isAvailable,
		false,
	);
	const stored = await findGame(integrationProvider, "game-1");
	assert.equal(stored?.provider, "updated-studio");
	assert.equal(stored?.type, "roulette");
	assert.equal(stored?.category, "Admin curated");
});

test("catalogue search ranks fuzzy matches and configured scope priorities", async () => {
	const fuzzy = await searchGames(
		{ q: "renamd", scope: "casino", page: 1, pageSize: 20 },
		integrationProvider,
	);
	assert.equal(fuzzy.games[0]?.name, "Renamed game");
	assert.equal(fuzzy.total, 1);
	const casino = await searchGames(
		{ q: "", scope: "casino", page: 1, pageSize: 20 },
		integrationProvider,
	);
	assert.equal(casino.games[0]?.name, "Zulu Booming game");

	const promotions = await searchGames(
		{ q: "", scope: "promotions", page: 1, pageSize: 20 },
		integrationProvider,
	);
	assert.deepEqual(
		promotions.games.map((candidate) => candidate.name),
		["Alpha Pragmatic game", "Zulu Booming game"],
	);

	const cached = await searchGames(
		{ q: "renamd", scope: "casino", page: 1, pageSize: 20 },
		integrationProvider,
	);
	assert.strictEqual(cached, fuzzy);
});
