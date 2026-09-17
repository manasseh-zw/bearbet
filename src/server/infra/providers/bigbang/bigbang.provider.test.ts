import assert from "node:assert/strict";
import { test } from "node:test";

import { createBigBangProvider } from "#/server/infra/providers/bigbang/bigbang.provider";

test("BigBang lists standard sandbox games and launches a demo URL", async () => {
	const requests: Array<{ url: string; init?: RequestInit }> = [];
	const provider = createBigBangProvider(
		{
			baseUrl: "https://sandbox.example/api/v1",
			sandboxKey: "ek_test_example",
		},
		async (url, init) => {
			requests.push({ url: String(url), init });
			if (String(url).includes("games?")) {
				return Response.json({
					success: true,
					data: [
						{
							id: 42,
							name: "demo-game",
							title: "Demo game",
							provider: "Test provider",
							thumbnail: null,
							game_type: "slot",
						},
					],
				});
			}
			return Response.json({
				success: true,
				game_url: "https://games.example/demo/42",
				game_id: 42,
				game_name: "Demo game",
			});
		},
	);

	assert.deepEqual(await provider.listSandboxGames(), [
		{
			id: 42,
			name: "demo-game",
			title: "Demo game",
			provider: "Test provider",
			thumbnail: null,
			game_type: "slot",
		},
	]);
	assert.deepEqual(await provider.launchDemoGame(42), {
		gameId: 42,
		gameName: "Demo game",
		url: "https://games.example/demo/42",
	});
	assert.equal(
		requests[0]?.url,
		"https://sandbox.example/api/v1/games?type=standard&limit=9",
	);
	assert.equal(requests[1]?.url, "https://sandbox.example/api/v1/games/launch");
	assert.equal(
		requests[1]?.init?.body,
		'{"game_id":42,"demo":true,"language":"en"}',
	);
});
