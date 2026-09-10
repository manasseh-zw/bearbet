import assert from "node:assert/strict";
import { test } from "node:test";

import { createFixtureProvider } from "#/server/infra/providers/fixture/fixture.provider";

test("fixture provider serves the captured catalogue and simulates failures", async () => {
	const provider = createFixtureProvider();
	const catalogue = await provider.syncCatalogue();
	assert.equal(catalogue.games.length, 80);
	assert.ok(
		catalogue.games.every((game) => game.bannerUrl && game.supportsFun),
	);
	assert.ok(catalogue.games.some((game) => game.type === "slots"));
	assert.ok(catalogue.games.some((game) => game.type !== "slots"));

	await assert.rejects(
		createFixtureProvider({ failure: "catalogue" }).syncCatalogue(),
		/catalogue is unavailable/,
	);
	await assert.rejects(
		createFixtureProvider({ failure: "launch" }).launchGame({
			gameId: "missing",
			userId: "player-1",
			userName: "Player",
			currencyCode: "USD",
		}),
		/game launch failed/,
	);
});
