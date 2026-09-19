import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { and, eq } from "drizzle-orm";

import { env } from "#/server/env";
import { db, pool } from "#/server/infra/db";
import {
	adminAuditEntry,
	game,
	gameProvider,
	user,
} from "#/server/infra/db/schema";

import { listAdminGames } from "./games.query";
import { AdminGameServiceError, updateAdminGame } from "./games.service";

const adminId = `game-admin-${crypto.randomUUID()}`;
const playerId = `game-player-${crypto.randomUUID()}`;
const curatedCategory = `Admin-${crypto.randomUUID()}`;
let gameId: string;

before(async () => {
	await db
		.insert(gameProvider)
		.values({ id: env.CASINO_PROVIDER, name: env.CASINO_PROVIDER })
		.onConflictDoNothing();
	await db.insert(user).values([
		{
			id: adminId,
			name: "Game Admin",
			email: `${adminId}@bearbet.test`,
			role: "admin",
		},
		{
			id: playerId,
			name: "Game Player",
			email: `${playerId}@bearbet.test`,
		},
	]);
	const [created] = await db
		.insert(game)
		.values({
			providerId: env.CASINO_PROVIDER,
			externalId: `admin-game-${crypto.randomUUID()}`,
			name: "Admin game test",
			contentProvider: "BearBet",
			category: "Slots",
			type: "slots",
			supportsFun: true,
			isAvailable: true,
			isMobile: true,
			hasFreeSpins: false,
			hasLobby: false,
			hasTables: false,
			lastSeenAt: new Date(),
		})
		.returning({ id: game.id });
	gameId = created.id;
});

after(async () => {
	await db
		.delete(adminAuditEntry)
		.where(
			and(
				eq(adminAuditEntry.actorUserId, adminId),
				eq(adminAuditEntry.targetId, gameId),
			),
		);
	await db.delete(game).where(eq(game.id, gameId));
	await db.delete(user).where(eq(user.id, adminId));
	await db.delete(user).where(eq(user.id, playerId));
	await pool.end();
});

test("game curation changes are audited and non-admins are rejected", async () => {
	const updated = await updateAdminGame({
		actorUserId: adminId,
		gameId,
		reason: "Promote the launch-week catalogue",
		category: curatedCategory,
		isFeatured: true,
		isPopular: true,
	});

	assert.equal(updated.isDuplicate, false);
	assert.equal(updated.game.category, curatedCategory);
	assert.equal(updated.game.isFeatured, true);
	assert.equal(updated.game.isPopular, true);

	const [audit] = await db
		.select({ action: adminAuditEntry.action })
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, gameId));
	assert.equal(audit?.action, "game_updated");

	await assert.rejects(
		updateAdminGame({
			actorUserId: playerId,
			gameId,
			reason: "Should not be allowed",
			isEnabled: false,
		}),
		(error: unknown) =>
			error instanceof AdminGameServiceError && error.code === "ADMIN_REQUIRED",
	);

	const query = {
		page: 999,
		pageSize: 24,
		search: "",
		provider: "",
		category: curatedCategory,
		availability: "all" as const,
		status: "all" as const,
		curation: "all" as const,
		sort: "name" as const,
		direction: "asc" as const,
	};
	const result = await listAdminGames(query);
	assert.equal(result.pagination.page, 1);
	assert.equal(result.items.some((item) => item.id === gameId), true);
});
