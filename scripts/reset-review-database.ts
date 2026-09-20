import { Pool } from "pg";

const confirmation = process.env.RESET_DATABASE_CONFIRM;
if (confirmation !== "bearbet-review-reset") {
	throw new Error(
		"Refusing to reset the database. Set RESET_DATABASE_CONFIRM=bearbet-review-reset to continue.",
	);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });

const statements = [
	"delete from provider_operation",
	"delete from game_round",
	"delete from game_session",
	"delete from withdrawal",
	"delete from bonus_award",
	"delete from ledger_entry",
	"delete from wallet_operation",
	"delete from player_favorite_game",
	"delete from player_recent_game",
	"delete from wallet",
	"delete from player",
	"delete from admin_audit_entry",
	"delete from game",
	"delete from game_provider",
	"delete from bonus_definition",
	"delete from session",
	"delete from verification",
	"delete from rate_limit",
	`delete from account where user_id in (select id from "user" where role is distinct from 'admin')`,
	`delete from "user" where role is distinct from 'admin'`,
] as const;

try {
	const client = await pool.connect();
	try {
		await client.query("begin");
		for (const statement of statements) {
			await client.query(statement);
		}
		await client.query("commit");
		console.log("Review database reset complete. Existing admin users were preserved.");
	} catch (error) {
		await client.query("rollback");
		throw error;
	} finally {
		client.release();
	}
} finally {
	await pool.end();
}
