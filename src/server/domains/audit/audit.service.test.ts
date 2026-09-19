import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { eq } from "drizzle-orm";

import { db, pool } from "#/server/infra/db";
import { adminAuditEntry, user } from "#/server/infra/db/schema";

import {
	AuditServiceError,
	recordAuditEntryInTransaction,
} from "./audit.service";

const adminId = `audit-admin-${crypto.randomUUID()}`;

before(async () => {
	await db.insert(user).values({
		id: adminId,
		name: "Audit Test Admin",
		email: `${adminId}@bearbet.test`,
		role: "admin",
	});
});

after(async () => {
	await db
		.delete(adminAuditEntry)
		.where(eq(adminAuditEntry.actorUserId, adminId));
	await db.delete(user).where(eq(user.id, adminId));
	await pool.end();
});

test("audit entries are validated, normalized, and persisted", async () => {
	const createdAt = new Date("2026-09-19T12:00:00.000Z");
	const entry = await db.transaction((transaction) =>
		recordAuditEntryInTransaction(transaction, {
			actorUserId: `  ${adminId}  `,
			target: { type: "withdrawal", id: "  withdrawal-1  " },
			action: "withdrawal_rejected",
			reason: "  Documents did not match  ",
			metadata: { source: "integration-test" },
			createdAt,
		}),
	);

	assert.equal(entry.actorUserId, adminId);
	assert.equal(entry.targetId, "withdrawal-1");
	assert.equal(entry.reason, "Documents did not match");
	assert.deepEqual(entry.metadata, { source: "integration-test" });
	assert.deepEqual(entry.createdAt, createdAt);
});

test("invalid audit input writes no database row", async () => {
	await assert.rejects(
		db.transaction((transaction) =>
			recordAuditEntryInTransaction(transaction, {
				actorUserId: adminId,
				target: { type: "withdrawal", id: "withdrawal-invalid" },
				action: "withdrawal_approved",
				reason: "   ",
			}),
		),
		AuditServiceError,
	);

	const rows = await db
		.select()
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, "withdrawal-invalid"));
	assert.equal(rows.length, 0);
});

test("audit evidence rolls back with its surrounding transaction", async () => {
	await assert.rejects(
		db.transaction(async (transaction) => {
			await recordAuditEntryInTransaction(transaction, {
				actorUserId: adminId,
				target: { type: "withdrawal", id: "withdrawal-rollback" },
				action: "withdrawal_approved",
				reason: "Transaction rollback test",
			});
			throw new Error("Force transaction rollback");
		}),
		/Force transaction rollback/,
	);

	const rows = await db
		.select()
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, "withdrawal-rollback"));
	assert.equal(rows.length, 0);
});
