import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createDrakonProvider, normalizeDrakonGame } from "../src/server/infra/providers/drakon/drakon.provider.ts";
import type { DrakonConfig } from "../src/server/infra/providers/drakon/drakon.types.ts";

const config: DrakonConfig = {
	baseUrl: process.env.DRAKON_BASE_URL ?? "https://gator.drakon.casino/api/v1/",
	agentCode: required("DRAKON_AGENT_CODE"),
	agentToken: required("DRAKON_AGENT_TOKEN"),
	agentSecret: required("DRAKON_AGENT_SECRET"),
	webhookKey: required("DRAKON_WEBHOOK_KEY"),
	mode: process.env.DRAKON_MODE === "real" ? "real" : "fun",
};

const root = resolve(import.meta.dirname, "..");
const rawPath = resolve(root, "data/drakon-games.raw.json");
const fixturePath = resolve(root, "src/server/infra/providers/fixture/games.json");
const provider = createDrakonProvider(config);
const rawGames = await provider.fetchRawCatalogue();
const normalizedGames = rawGames.map(normalizeDrakonGame);
const selectedGames = selectFixtureGames(normalizedGames, 80);
const capturedAt = new Date().toISOString();

await mkdir(dirname(rawPath), { recursive: true });
await writeJson(rawPath, { capturedAt, source: "drakon", games: rawGames });
await writeJson(fixturePath, {
	capturedAt,
	source: "drakon",
	totalSourceGames: rawGames.length,
	games: selectedGames,
});

process.stdout.write(
	`Captured ${rawGames.length} Drakon games and selected ${selectedGames.length} fixture games.\n`,
);

function selectFixtureGames(games: typeof normalizedGames, limit: number) {
	const usable = games.filter((game) => game.supportsFun && game.bannerUrl);
	const selected = new Map<string, (typeof usable)[number]>();
	const providers = new Set<string>();

	for (const game of usable) {
		if (providers.has(game.provider)) continue;
		selected.set(game.id, game);
		providers.add(game.provider);
		if (selected.size === limit) return [...selected.values()];
	}

	for (const game of usable) {
		selected.set(game.id, game);
		if (selected.size === limit) break;
	}

	return [...selected.values()];
}

function required(name: string) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is required`);
	return value;
}

async function writeJson(path: string, value: unknown) {
	await writeFile(path, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
}
