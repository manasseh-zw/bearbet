import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { and, count, eq } from "drizzle-orm";
import { MoneyRuleError } from "#/server/domains/wallet/wallet.policy";
import { db, pool } from "#/server/infra/db";
import {
	adminAuditEntry,
	ledgerEntry,
	player,
	user,
	wallet,
	walletOperation,
	withdrawal,
} from "#/server/infra/db/schema";

import {
	requestWithdrawal,
	reviewWithdrawal,
	WithdrawalServiceError,
} from "./withdrawal.service";

const playerId = `withdrawal-test-${crypto.randomUUID()}`;
const adminId = `withdrawal-admin-${crypto.randomUUID()}`;

before(async () => {
	await db.insert(user).values([
		{
			id: playerId,
			name: "Withdrawal Test",
			email: `${playerId}@bearbet.test`,
			role: "user",
		},
		{
			id: adminId,
			name: "Withdrawal Admin",
			email: `${adminId}@bearbet.test`,
			role: "admin",
		},
	]);
	await db.insert(player).values({
		userId: playerId,
		firstName: "Withdrawal",
		lastName: "Test",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(wallet).values({
		playerId,
		currencyCode: "USD",
		cashBalanceMinor: 70_000,
		bonusBalanceMinor: 10_000,
	});
});

after(async () => {
	const [storedWallet] = await db
		.select({ id: wallet.id })
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	await db.delete(withdrawal).where(eq(withdrawal.playerId, playerId));
	if (storedWallet) {
		await db
			.delete(ledgerEntry)
			.where(eq(ledgerEntry.walletId, storedWallet.id));
		await db
			.delete(walletOperation)
			.where(eq(walletOperation.walletId, storedWallet.id));
		await db.delete(wallet).where(eq(wallet.id, storedWallet.id));
	}
	await db
		.delete(adminAuditEntry)
		.where(eq(adminAuditEntry.actorUserId, adminId));
	await db.delete(player).where(eq(player.userId, playerId));
	await db.delete(user).where(eq(user.id, playerId));
	await db.delete(user).where(eq(user.id, adminId));
	await pool.end();
});

test("withdrawal request reserves cash once and rejects conflicting retries", async () => {
	const idempotencyKey = `${playerId}:withdrawal-1`;
	const first = await requestWithdrawal({
		playerId,
		amountMinor: 20_000,
		idempotencyKey,
	});
	const retry = await requestWithdrawal({
		playerId,
		amountMinor: 20_000,
		idempotencyKey,
	});

	assert.equal(first.withdrawal.status, "pending");
	assert.equal(retry.isDuplicate, true);
	assert.equal(retry.withdrawal.id, first.withdrawal.id);
	const [reservedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	assert.equal(reservedWallet?.cashBalanceMinor, 50_000);
	assert.equal(reservedWallet?.bonusBalanceMinor, 10_000);
	assert.equal(reservedWallet?.reservedCashMinor, 20_000);

	await assert.rejects(
		requestWithdrawal({
			playerId,
			amountMinor: 21_000,
			idempotencyKey,
		}),
		(error) =>
			error instanceof WithdrawalServiceError &&
			error.code === "IDEMPOTENCY_CONFLICT",
	);

	const concurrentKey = `${playerId}:concurrent-withdrawal`;
	const concurrent = await Promise.all([
		requestWithdrawal({
			playerId,
			amountMinor: 1_000,
			idempotencyKey: concurrentKey,
		}),
		requestWithdrawal({
			playerId,
			amountMinor: 1_000,
			idempotencyKey: concurrentKey,
		}),
	]);
	assert.equal(concurrent.filter((result) => result.isDuplicate).length, 1);
	await reviewWithdrawal({
		withdrawalId: concurrent[0].withdrawal.id,
		reviewerUserId: adminId,
		decision: "reject",
		reason: "Concurrency check complete",
	});
});

test("only an active admin can approve and approval cannot be reversed", async () => {
	const pending = await requestWithdrawal({
		playerId,
		amountMinor: 10_000,
		idempotencyKey: `${playerId}:withdrawal-2`,
	});
	await assert.rejects(
		reviewWithdrawal({
			withdrawalId: pending.withdrawal.id,
			reviewerUserId: playerId,
			decision: "approve",
			reason: "Self approval",
		}),
		(error) =>
			error instanceof WithdrawalServiceError &&
			error.code === "ADMIN_REQUIRED",
	);

	const approved = await reviewWithdrawal({
		withdrawalId: pending.withdrawal.id,
		reviewerUserId: adminId,
		decision: "approve",
		reason: "Demo request checked",
	});
	assert.equal(approved.withdrawal.status, "approved");
	const retry = await reviewWithdrawal({
		withdrawalId: pending.withdrawal.id,
		reviewerUserId: adminId,
		decision: "approve",
		reason: "Retry",
	});
	assert.equal(retry.isDuplicate, true);
	const [auditEntry] = await db
		.select()
		.from(adminAuditEntry)
		.where(
			and(
				eq(adminAuditEntry.actorUserId, adminId),
				eq(adminAuditEntry.targetId, pending.withdrawal.id),
			),
		);
	assert.equal(auditEntry?.action, "withdrawal_approved");
	assert.equal(auditEntry?.reason, "Demo request checked");
	assert.equal(
		(auditEntry?.metadata as { walletOperationId?: string })
			.walletOperationId !== undefined,
		true,
	);
	const [auditCount] = await db
		.select({ value: count() })
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, pending.withdrawal.id));
	assert.equal(auditCount?.value, 1);
	await assert.rejects(
		reviewWithdrawal({
			withdrawalId: pending.withdrawal.id,
			reviewerUserId: adminId,
			decision: "reject",
			reason: "Conflicting decision",
		}),
		(error) =>
			error instanceof WithdrawalServiceError &&
			error.code === "ALREADY_REVIEWED",
	);
});

test("a banned admin cannot review and leaves withdrawal state unchanged", async () => {
	const pending = await requestWithdrawal({
		playerId,
		amountMinor: 2_000,
		idempotencyKey: `${playerId}:withdrawal-banned-admin`,
	});
	const [reservedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));

	await db.update(user).set({ banned: true }).where(eq(user.id, adminId));
	try {
		await assert.rejects(
			reviewWithdrawal({
				withdrawalId: pending.withdrawal.id,
				reviewerUserId: adminId,
				decision: "approve",
				reason: "This must not be accepted",
			}),
			(error) =>
				error instanceof WithdrawalServiceError &&
				error.code === "ADMIN_REQUIRED",
		);
	} finally {
		await db.update(user).set({ banned: false }).where(eq(user.id, adminId));
	}

	const [unchangedWithdrawal] = await db
		.select()
		.from(withdrawal)
		.where(eq(withdrawal.id, pending.withdrawal.id));
	const [unchangedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	const [auditCount] = await db
		.select({ value: count() })
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, pending.withdrawal.id));

	assert.equal(unchangedWithdrawal?.status, "pending");
	assert.equal(unchangedWithdrawal?.reviewerUserId, null);
	assert.equal(
		unchangedWallet?.cashBalanceMinor,
		reservedWallet?.cashBalanceMinor,
	);
	assert.equal(
		unchangedWallet?.reservedCashMinor,
		reservedWallet?.reservedCashMinor,
	);
	assert.equal(auditCount?.value, 0);

	await reviewWithdrawal({
		withdrawalId: pending.withdrawal.id,
		reviewerUserId: adminId,
		decision: "reject",
		reason: "Test cleanup",
	});
});

test("concurrent identical reviews move money and write audit evidence once", async () => {
	const pending = await requestWithdrawal({
		playerId,
		amountMinor: 3_000,
		idempotencyKey: `${playerId}:withdrawal-concurrent-review`,
	});
	const reviews = await Promise.all([
		reviewWithdrawal({
			withdrawalId: pending.withdrawal.id,
			reviewerUserId: adminId,
			decision: "reject",
			reason: "Concurrent review",
		}),
		reviewWithdrawal({
			withdrawalId: pending.withdrawal.id,
			reviewerUserId: adminId,
			decision: "reject",
			reason: "Concurrent retry",
		}),
	]);

	assert.equal(reviews.filter((review) => review.isDuplicate).length, 1);
	const [auditCount] = await db
		.select({ value: count() })
		.from(adminAuditEntry)
		.where(eq(adminAuditEntry.targetId, pending.withdrawal.id));
	const [operationCount] = await db
		.select({ value: count() })
		.from(walletOperation)
		.where(
			and(
				eq(walletOperation.sourceId, pending.withdrawal.id),
				eq(walletOperation.type, "withdrawal_release"),
			),
		);

	assert.equal(auditCount?.value, 1);
	assert.equal(operationCount?.value, 1);
});

test("rejection returns reserved cash and over-withdrawal rolls back", async () => {
	const before = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	const cashBefore = before[0]?.cashBalanceMinor;
	assert.notEqual(cashBefore, undefined);

	const pending = await requestWithdrawal({
		playerId,
		amountMinor: 5_000,
		idempotencyKey: `${playerId}:withdrawal-3`,
	});
	await reviewWithdrawal({
		withdrawalId: pending.withdrawal.id,
		reviewerUserId: adminId,
		decision: "reject",
		reason: "Return demo funds",
	});
	const [releasedWallet] = await db
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	assert.equal(releasedWallet?.cashBalanceMinor, cashBefore);

	await assert.rejects(
		requestWithdrawal({
			playerId,
			amountMinor: (releasedWallet?.cashBalanceMinor ?? 0) + 1,
			idempotencyKey: `${playerId}:over-withdrawal`,
		}),
		MoneyRuleError,
	);
	const [rolledBack] = await db
		.select()
		.from(withdrawal)
		.where(eq(withdrawal.idempotencyKey, `${playerId}:over-withdrawal`));
	assert.equal(rolledBack, undefined);
});
