import assert from "node:assert/strict";
import { test } from "node:test";

import { listGames } from "#/server/domains/game/game.service";
import type { CasinoProvider } from "#/server/infra/providers/provider.types";

test("game service returns the configured provider catalogue", async () => {
	const provider: CasinoProvider = {
		async syncCatalogue() {
			return {
				games: [
					{
						id: "game-1",
						name: "Fixture game",
						provider: "fixture",
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

	const games = await listGames(provider);
	assert.equal(games.length, 1);
	assert.equal(games[0]?.id, "game-1");
});
