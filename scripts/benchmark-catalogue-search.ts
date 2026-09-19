import { performance } from "node:perf_hooks";

import { searchGames } from "#/server/domains/game/game.service";
import { pool } from "#/server/infra/db";

const terms = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const searches = terms.length > 0 ? terms : ["roulette", "playtech", "dragon", "slots", "book"];
const budgetArgument = process.argv.find((argument) => argument.startsWith("--budget-ms="));
const budgetMs = Number(budgetArgument?.split("=")[1] ?? 150);

try {
	const cold: number[] = [];
	const cached: number[] = [];
	for (const query of searches) {
		const start = performance.now();
		await searchGames({ q: query, scope: "casino", page: 1, pageSize: 48 });
		cold.push(performance.now() - start);

		const cachedStart = performance.now();
		await searchGames({ q: query, scope: "casino", page: 1, pageSize: 48 });
		cached.push(performance.now() - cachedStart);
	}

	const coldP95 = percentile(cold, 0.95);
	const cachedP95 = percentile(cached, 0.95);
	console.log(`Catalogue search (${searches.length} terms)`);
	console.log(`cold p95: ${coldP95.toFixed(1)} ms`);
	console.log(`cached p95: ${cachedP95.toFixed(1)} ms`);
	console.log(`budget: ${budgetMs.toFixed(1)} ms`);
	if (coldP95 > budgetMs) process.exitCode = 1;
} finally {
	await pool.end();
}

function percentile(values: number[], percentileValue: number) {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.ceil(sorted.length * percentileValue) - 1] ?? 0;
}
