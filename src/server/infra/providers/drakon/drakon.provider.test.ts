import assert from "node:assert/strict";
import { test } from "node:test";

import { createDrakonProvider } from "#/server/infra/providers/drakon/drakon.provider";
import type { DrakonConfig } from "#/server/infra/providers/drakon/drakon.types";

const config: DrakonConfig = {
	baseUrl: "https://gator.drakon.casino/api/v1/",
	agentCode: "test-code",
	agentToken: "test-token",
	agentSecret: "test-secret",
	webhookKey: "test-webhook-key",
	mode: "fun",
};

test("Drakon authenticates, normalizes the catalogue, and refreshes one expired token", async (t) => {
	let authCalls = 0;
	let catalogueCalls = 0;
	let launchCalls = 0;

	const fetcher = t.mock.fn(
		async (input: URL | RequestInfo, init?: RequestInit) => {
			const url = new URL(input.toString());
			const headers = new Headers(init?.headers);

			if (url.pathname.endsWith("/auth/authentication")) {
				authCalls += 1;
				assert.equal(init?.method, "POST");
				assert.equal(
					headers.get("Authorization"),
					`Bearer ${Buffer.from("test-token:test-secret").toString("base64")}`,
				);
				return Response.json({ access_token: `access-${authCalls}` });
			}

			if (url.pathname.endsWith("/games/all")) {
				catalogueCalls += 1;
				assert.equal(headers.get("Authorization"), "Bearer access-1");
				return Response.json({
					status: "success",
					games: [
						{
							game_id: 51096,
							game_code: "test-game",
							game_name: "Test game",
							provider_game: "Test provider",
							rtp: "96.2",
							banner: "https://cdn.example.com/test.webp",
							only_demo: 1,
						},
					],
				});
			}

			launchCalls += 1;
			if (launchCalls === 1) return new Response(null, { status: 401 });
			assert.equal(headers.get("Authorization"), "Bearer access-2");
			assert.deepEqual(Object.fromEntries(url.searchParams), {
				agent_code: "test-code",
				agent_token: "test-token",
				game_id: "51096",
				currency: "USD",
				lang: "en",
				user_id: "player-1",
				user_name: "Test Player",
				type: "CHARGED",
				mode: "fun",
			});
			return Response.json({ game_url: "https://games.example.com/session/1" });
		},
	) as typeof fetch;

	const provider = createDrakonProvider(config, fetcher);
	const catalogue = await provider.syncCatalogue();
	assert.deepEqual(catalogue.games[0], {
		id: "51096",
		code: "test-game",
		name: "Test game",
		provider: "Test provider",
		rtp: 96.2,
		bannerUrl: "https://cdn.example.com/test.webp",
		supportsFun: true,
		isAvailable: false,
		isMobile: false,
		hasFreeSpins: false,
		hasLobby: false,
		hasTables: false,
	});
	assert.deepEqual(
		await provider.launchGame({
			gameId: "51096",
			userId: "player-1",
			userName: "Test Player",
			currencyCode: "USD",
		}),
		{ url: "https://games.example.com/session/1" },
	);
	assert.equal(authCalls, 2);
	assert.equal(catalogueCalls, 1);
	assert.equal(launchCalls, 2);
});

test("Drakon rejects real-only games in fun mode and its game-error URL", async (t) => {
	let gameUrl = "https://gator.drakon.casino/game-error";
	const fetcher = t.mock.fn(async (input: URL | RequestInfo) => {
		const url = new URL(input.toString());
		if (url.pathname.endsWith("/auth/authentication")) {
			return Response.json({ access_token: "access" });
		}
		if (url.pathname.endsWith("/games/all")) {
			return Response.json({
				games: [
					{
						game_id: "demo",
						game_name: "Demo",
						provider_game: "Provider",
						only_demo: 1,
					},
					{
						game_id: "real",
						game_name: "Real",
						provider_game: "Provider",
						only_demo: 0,
					},
				],
			});
		}
		return Response.json({ game_url: gameUrl });
	}) as typeof fetch;

	const provider = createDrakonProvider(config, fetcher);
	await provider.syncCatalogue();
	await assert.rejects(
		provider.launchGame({
			gameId: "real",
			userId: "1",
			userName: "Player",
			currencyCode: "USD",
		}),
		/FUN_MODE_NOT_AVAILABLE/,
	);
	await assert.rejects(
		provider.launchGame({
			gameId: "demo",
			userId: "1",
			userName: "Player",
			currencyCode: "USD",
		}),
		/GAME_UNAVAILABLE/,
	);
	gameUrl = "javascript:alert(1)";
	await assert.rejects(
		provider.launchGame({
			gameId: "demo",
			userId: "1",
			userName: "Player",
			currencyCode: "USD",
		}),
		/unsupported game URL/,
	);
});
