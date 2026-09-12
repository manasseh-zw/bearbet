import { syncGameCatalogue } from "#/server/domains/game/game.service";
import { pool } from "#/server/infra/db";
import { env } from "#/server/env";

try {
	const result = await syncGameCatalogue({
		integrationProvider: env.CASINO_PROVIDER,
	});
	console.log(
		`Synced ${result.gameCount} ${env.CASINO_PROVIDER} games at ${result.syncedAt.toISOString()}`,
	);
} finally {
	await pool.end();
}
