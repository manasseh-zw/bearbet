import assert from "node:assert/strict";
import test, { after } from "node:test";

import { count, eq, or } from "drizzle-orm";

import { db, pool } from "#/server/infra/db";
import {
	adminAuditEntry,
	bonusAward,
	bonusDefinition,
	player,
	user,
} from "#/server/infra/db/schema";

import {
	createAdminBonusDefinition,
	setAdminBonusDefinitionStatus,
	updateAdminBonusDefinition,
} from "./bonuses.service";

after(async () => {
	await pool.end();
});

test("bonus definition mutations are audited and preserve issued award snapshots", async (context) => {
	const ids = await createFixture();

	const created = await createAdminBonusDefinition({
		actorUserId: ids.adminId,
		code: `NEW_${ids.definitionId.slice(0, 8)}`,
		name: "New campaign",
		description: "A new campaign",
		type: "promotional",
		amountMinor: 7500,
		wageringMultiplier: 4,
		expiresAfterDays: 14,
		reason: "Launch a new campaign",
	});
	assert.equal(created.isDuplicate, false);
	context.after(() =>
		cleanupFixture({ ...ids, createdDefinitionId: created.definition.id }),
	);

	const updated = await updateAdminBonusDefinition({
		actorUserId: ids.adminId,
		definitionId: ids.definitionId,
		name: "Updated campaign",
		description: "Updated rules",
		type: "promotional",
		amountMinor: 12_000,
		wageringMultiplier: 8,
		expiresAfterDays: 45,
		reason: "Refresh the campaign rules",
	});
	assert.equal(updated.isDuplicate, false);

	const [award] = await db
		.select({
			awardedAmountMinor: bonusAward.awardedAmountMinor,
			requiredWagerMinor: bonusAward.requiredWagerMinor,
			expiresAt: bonusAward.expiresAt,
			eligibleCategories: bonusAward.eligibleCategories,
		})
		.from(bonusAward)
		.where(eq(bonusAward.definitionId, ids.definitionId));
	assert.equal(award?.awardedAmountMinor, 5000);
	assert.equal(award?.requiredWagerMinor, 5000);
	assert.equal(
		award?.expiresAt.toISOString(),
		ids.awardExpiresAt.toISOString(),
	);
	assert.deepEqual(award?.eligibleCategories, ["Slots"]);

	const deactivated = await setAdminBonusDefinitionStatus({
		actorUserId: ids.adminId,
		definitionId: ids.definitionId,
		isActive: false,
		reason: "Pause the campaign",
	});
	assert.equal(deactivated.definition.isActive, false);

	await assert.rejects(
		() =>
			updateAdminBonusDefinition({
				actorUserId: ids.playerId,
				definitionId: ids.definitionId,
				name: "Unauthorized",
				type: "promotional",
				amountMinor: 12_000,
				wageringMultiplier: 8,
				expiresAfterDays: 45,
				reason: "Should be rejected",
			}),
		(error: unknown) =>
			error instanceof Error &&
			"code" in error &&
			error.code === "ADMIN_REQUIRED",
	);

	const [auditCount] = await db
		.select({ value: count() })
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, ids.definitionId));
	assert.equal(auditCount?.value, 2);
});

async function createFixture() {
	const adminId = `bonus-admin-${crypto.randomUUID()}`;
	const playerId = `bonus-player-${crypto.randomUUID()}`;
	const definitionId = crypto.randomUUID();
	const awardExpiresAt = new Date("2027-01-01T00:00:00.000Z");

	await db.insert(user).values([
		{
			id: adminId,
			name: "Bonus Admin",
			email: `${adminId}@bearbet.test`,
			role: "admin",
			banned: false,
		},
		{
			id: playerId,
			name: "Bonus Player",
			email: `${playerId}@bearbet.test`,
			role: "user",
			banned: false,
		},
	]);
	await db.insert(player).values({
		userId: playerId,
		firstName: "Bonus",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(bonusDefinition).values({
		id: definitionId,
		code: `SNAP_${definitionId.slice(0, 8)}`,
		name: "Snapshot campaign",
		type: "promotional",
		amountMinor: 5000,
		wageringMultiplier: 1,
		expiresAfterDays: 7,
		eligibleCategories: ["Slots"],
	});
	await db.insert(bonusAward).values({
		definitionId,
		playerId,
		status: "active",
		awardedAmountMinor: 5000,
		bonusBalanceMinor: 5000,
		requiredWagerMinor: 5000,
		completedWagerMinor: 0,
		eligibleGameIds: [],
		eligibleCategories: ["Slots"],
		eligibleProviders: [],
		idempotencyKey: `snapshot:${definitionId}`,
		expiresAt: awardExpiresAt,
	});
	return { adminId, playerId, definitionId, awardExpiresAt };
}

async function cleanupFixture(
	ids: Awaited<ReturnType<typeof createFixture>> & {
		createdDefinitionId?: string;
	},
) {
	await db
		.delete(adminAuditEntry)
		.where(
			or(
				eq(adminAuditEntry.targetId, ids.definitionId),
				eq(adminAuditEntry.actorUserId, ids.adminId),
			),
		);
	await db
		.delete(bonusAward)
		.where(eq(bonusAward.definitionId, ids.definitionId));
	await db
		.delete(bonusDefinition)
		.where(eq(bonusDefinition.id, ids.definitionId));
	if (ids.createdDefinitionId) {
		await db
			.delete(bonusDefinition)
			.where(eq(bonusDefinition.id, ids.createdDefinitionId));
	}
	await db.delete(player).where(eq(player.userId, ids.playerId));
	await db.delete(user).where(eq(user.id, ids.playerId));
	await db.delete(user).where(eq(user.id, ids.adminId));
}
