import "@tanstack/react-start/server-only";

import { fixtureCatalogueSchema } from "#/server/infra/providers/fixture/fixture.types";
import fixtureData from "#/server/infra/providers/fixture/games.json" with {
	type: "json",
};
import type { CasinoProvider } from "#/server/infra/providers/provider.types";

export type FixtureProviderOptions = {
	delayMs?: number;
	failure?: "none" | "catalogue" | "launch";
};

export function createFixtureProvider(
	options: FixtureProviderOptions = {},
): CasinoProvider {
	const fixture = fixtureCatalogueSchema.parse(fixtureData);
	const delayMs = options.delayMs ?? 0;
	const failure = options.failure ?? "none";

	return {
		async syncCatalogue() {
			await delay(delayMs);
			if (failure === "catalogue")
				throw new Error("Fixture catalogue is unavailable");
			return { games: fixture.games };
		},

		async launchGame(input) {
			await delay(delayMs);
			if (failure === "launch") throw new Error("Fixture game launch failed");
			if (!fixture.games.some((game) => game.id === input.gameId)) {
				throw new Error("Choose a game from the current catalogue");
			}
			return {
				url: `https://fixture.bearbet.local/games/${encodeURIComponent(input.gameId)}`,
			};
		},
	};
}

async function delay(milliseconds: number) {
	if (milliseconds > 0)
		await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
