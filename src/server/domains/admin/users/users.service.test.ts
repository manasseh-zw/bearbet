import assert from "node:assert/strict";
import test, { after } from "node:test";

import { count, eq } from "drizzle-orm";

import { db, pool } from "#/server/infra/db";
import {
	account,
	adminAuditEntry,
	bonusAward,
	bonusDefinition,
	ledgerEntry,
	player,
	session,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

import {
	activateAdminUser,
	adjustAdminUserBalance,
	assignAdminUserBonus,
	suspendAdminUser,
} from "./users.service";

after(async () => {
	await pool.end();
});

test("admin user actions lock authorization, audit changes, and revoke sessions", async (context) => {
	const ids = await createFixture();
	context.after(() => cleanupFixture(ids));

	const suspended = await suspendAdminUser({
		actorUserId: ids.adminId,
		userId: ids.playerId,
		reason: "Manual review required",
	});
	assert.equal(suspended.isDuplicate, false);

	const [suspendedUser] = await db
		.select({ banned: user.banned })
		.from(user)
		.where(eq(user.id, ids.playerId));
	const [remainingSession] = await db
		.select({ id: session.id })
		.from(session)
		.where(eq(session.userId, ids.playerId));
	assert.equal(suspendedUser?.banned, true);
	assert.equal(remainingSession, undefined);

	const duplicateSuspend = await suspendAdminUser({
		actorUserId: ids.adminId,
		userId: ids.playerId,
		reason: "Repeated request",
	});
	assert.equal(duplicateSuspend.isDuplicate, true);

	const activated = await activateAdminUser({
		actorUserId: ids.adminId,
		userId: ids.playerId,
		reason: "Review complete",
	});
	assert.equal(activated.isDuplicate, false);

	const adjustment = await adjustAdminUserBalance({
		actorUserId: ids.adminId,
		userId: ids.playerId,
		amountMinor: 2500,
		reason: "Reviewer credit",
		idempotencyKey: `test-adjustment:${ids.playerId}`,
	});
	const duplicateAdjustment = await adjustAdminUserBalance({
		actorUserId: ids.adminId,
		userId: ids.playerId,
		amountMinor: 2500,
		reason: "Retry",
		idempotencyKey: `test-adjustment:${ids.playerId}`,
	});
	assert.equal(adjustment.isDuplicate, false);
	assert.equal(duplicateAdjustment.isDuplicate, true);

	const auditCount = await db
		.select({ value: count() })
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, ids.playerId));
	assert.equal(auditCount[0]?.value, 3);
});

test("admin bonus assignment credits the wallet and records one audit", async (context) => {
	const ids = await createFixture();
	context.after(() => cleanupFixture(ids));

	const result = await assignAdminUserBonus({
		actorUserId: ids.adminId,
		userId: ids.playerId,
		definitionId: ids.definitionId,
		reason: "Customer recovery credit",
		idempotencyKey: `test-bonus:${ids.playerId}`,
	});
	const duplicate = await assignAdminUserBonus({
		actorUserId: ids.adminId,
		userId: ids.playerId,
		definitionId: ids.definitionId,
		reason: "Retry",
		idempotencyKey: `test-bonus:${ids.playerId}`,
	});

	assert.equal(result.isDuplicate, false);
	assert.equal(duplicate.isDuplicate, true);
	assert.equal(result.award.awardedAmountMinor, 5000);

	const [storedWallet] = await db
		.select({ bonusBalanceMinor: wallet.bonusBalanceMinor })
		.from(wallet)
		.where(eq(wallet.playerId, ids.playerId));
	const [auditCount] = await db
		.select({ value: count() })
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.actorUserId, ids.adminId));
	assert.equal(storedWallet?.bonusBalanceMinor, 5000);
	assert.equal(auditCount?.value, 1);
});

async function createFixture() {
	const adminId = `admin-${crypto.randomUUID()}`;
	const playerId = `player-${crypto.randomUUID()}`;
	const definitionId = crypto.randomUUID();
	const walletId = crypto.randomUUID();
	await db.insert(user).values([
		{
			id: adminId,
			name: "Test Admin",
			email: `${adminId}@bearbet.test`,
			role: "admin",
			banned: false,
		},
		{
			id: playerId,
			name: "Test Player",
			email: `${playerId}@bearbet.test`,
			role: "user",
			banned: false,
		},
	]);
	await db.insert(player).values({
		userId: playerId,
		firstName: "Test",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(wallet).values({
		id: walletId,
		playerId,
		currencyCode: "USD",
		cashBalanceMinor: 10_000,
	});
	await db.insert(bonusDefinition).values({
		id: definitionId,
		code: `TEST_${definitionId.slice(0, 8)}`,
		name: "Test bonus",
		type: "promotional",
		amountMinor: 5000,
		wageringMultiplier: 1,
		expiresAfterDays: 7,
	});
	await db.insert(session).values({
		id: crypto.randomUUID(),
		expiresAt: new Date(Date.now() + 60_000),
		token: `test-token-${playerId}`,
		createdAt: new Date(),
		updatedAt: new Date(),
		userId: playerId,
	});
	return { adminId, playerId, definitionId, walletId };
}

async function cleanupFixture(ids: Awaited<ReturnType<typeof createFixture>>) {
	const operations = await db
		.select({ id: walletOperation.id })
		.from(walletOperation)
		.where(eq(walletOperation.walletId, ids.walletId));
	if (operations.length) {
		await db.delete(ledgerEntry).where(eq(ledgerEntry.walletId, ids.walletId));
		await db
			.delete(walletOperation)
			.where(eq(walletOperation.walletId, ids.walletId));
	}
	await db
		.delete(adminAuditEntry)
		.where(eq(adminAuditEntry.actorUserId, ids.adminId));
	await db.delete(bonusAward).where(eq(bonusAward.playerId, ids.playerId));
	await db.delete(session).where(eq(session.userId, ids.playerId));
	await db.delete(wallet).where(eq(wallet.id, ids.walletId));
	await db.delete(player).where(eq(player.userId, ids.playerId));
	await db.delete(account).where(eq(account.userId, ids.playerId));
	await db.delete(user).where(eq(user.id, ids.playerId));
	await db.delete(user).where(eq(user.id, ids.adminId));
	await db
		.delete(bonusDefinition)
		.where(eq(bonusDefinition.id, ids.definitionId));
}
