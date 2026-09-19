import assert from "node:assert/strict";
import test, { after } from "node:test";

import { and, eq, inArray } from "drizzle-orm";

import { recordBet } from "#/server/domains/gameplay/gameplay.service";
import { applyWalletOperation } from "#/server/domains/wallet/wallet.service";
import {
	requestWithdrawal,
	reviewWithdrawal,
} from "#/server/domains/withdrawal/withdrawal.service";
import { db, pool } from "#/server/infra/db";
import {
	adminAuditEntry,
	gameRound,
	gameSession,
	ledgerEntry,
	player,
	providerOperation,
	user,
	wallet,
	walletOperation,
	withdrawal,
} from "#/server/infra/db/schema";

import { listAdminActivity, listAdminWithdrawals } from "./operations.query";

type WalletActivityPage = Extract<
	Awaited<ReturnType<typeof listAdminActivity>>,
	{ tab: "wallet" }
>;
type WithdrawalActivityPage = Extract<
	Awaited<ReturnType<typeof listAdminActivity>>,
	{ tab: "withdrawals" }
>;
type AuditActivityPage = Extract<
	Awaited<ReturnType<typeof listAdminActivity>>,
	{ tab: "audit" }
>;

const suffix = crypto.randomUUID();
const playerId = `operations-player-${suffix}`;
const adminId = `operations-admin-${suffix}`;

after(async () => {
	const [storedWallet] = await db
		.select({ id: wallet.id })
		.from(wallet)
		.where(eq(wallet.playerId, playerId));
	if (storedWallet) {
		await db
			.delete(providerOperation)
			.where(eq(providerOperation.playerId, playerId));
		await db.delete(gameRound).where(eq(gameRound.playerId, playerId));
		await db.delete(gameSession).where(eq(gameSession.playerId, playerId));
		await db
			.delete(ledgerEntry)
			.where(eq(ledgerEntry.walletId, storedWallet.id));
		await db
			.delete(walletOperation)
			.where(eq(walletOperation.walletId, storedWallet.id));
		await db.delete(wallet).where(eq(wallet.id, storedWallet.id));
	}
	await db.delete(withdrawal).where(eq(withdrawal.playerId, playerId));
	await db
		.delete(adminAuditEntry)
		.where(
			and(
				eq(adminAuditEntry.actorUserId, adminId),
				eq(adminAuditEntry.targetType, "withdrawal"),
			),
		);
	await db.delete(player).where(eq(player.userId, playerId));
	await db.delete(user).where(inArray(user.id, [playerId, adminId]));
	await pool.end();
});

test("admin withdrawal projections include player, wallet, and decision evidence", async () => {
	await db.insert(user).values([
		{
			id: playerId,
			name: "Operations Player",
			email: `${playerId}@bearbet.test`,
			role: "user",
		},
		{
			id: adminId,
			name: "Operations Admin",
			email: `${adminId}@bearbet.test`,
			role: "admin",
		},
	]);
	await db.insert(player).values({
		userId: playerId,
		firstName: "Operations",
		lastName: "Player",
		dateOfBirth: "1990-01-01",
		countryCode: "ZW",
	});
	await db.insert(wallet).values({
		playerId,
		currencyCode: "USD",
		cashBalanceMinor: 50_000,
	});

	const pending = await requestWithdrawal({
		playerId,
		amountMinor: 10_000,
		idempotencyKey: `${playerId}:pending`,
	});
	const pendingList = await listAdminWithdrawals({
		page: 1,
		pageSize: 20,
		search: "Operations",
		status: "pending",
		direction: "desc",
	});

	assert.equal(pendingList.pagination.total, 1);
	assert.equal(pendingList.items[0]?.withdrawal.id, pending.withdrawal.id);
	assert.deepEqual(pendingList.items[0]?.player, {
		id: playerId,
		name: "Operations Player",
		email: `${playerId}@bearbet.test`,
		username: null,
		status: "active",
		firstName: "Operations",
		lastName: "Player",
	});
	assert.equal(pendingList.items[0]?.wallet.cashBalanceMinor, 40_000);
	assert.equal(pendingList.items[0]?.wallet.reservedCashMinor, 10_000);
	assert.equal(pendingList.items[0]?.decision.reviewer, null);

	await reviewWithdrawal({
		withdrawalId: pending.withdrawal.id,
		reviewerUserId: adminId,
		decision: "reject",
		reason: "Operations test rejection",
	});
	const rejectedList = await listAdminWithdrawals({
		page: 1,
		pageSize: 20,
		search: "",
		status: "rejected",
		direction: "desc",
	});
	assert.equal(rejectedList.items[0]?.decision.status, "rejected");
	assert.equal(
		rejectedList.items[0]?.decision.reviewer?.name,
		"Operations Admin",
	);
	assert.equal(
		rejectedList.items[0]?.decision.reason,
		"Operations test rejection",
	);
});

test("admin activity uses cursors and exposes wallet, withdrawal, and audit tabs", async () => {
	await applyWalletOperation({
		playerId,
		type: "demo_top_up",
		idempotencyKey: `${playerId}:activity-top-up`,
		movements: [{ bucket: "cash", amountMinor: 500 }],
	});
	const second = await requestWithdrawal({
		playerId,
		amountMinor: 2_000,
		idempotencyKey: `${playerId}:activity-withdrawal`,
	});
	await recordBet({
		integrationProvider: "fixture",
		playerId,
		externalTransactionId: `${playerId}:activity-bet`,
		externalSessionId: `${playerId}:activity-session`,
		externalRoundId: `${playerId}:activity-round`,
		gameId: "activity-game",
		amountMinor: 100,
	});

	const firstPage = (await listAdminActivity({
		tab: "wallet",
		search: playerId,
		limit: 1,
		withdrawalStatus: "all",
	})) as WalletActivityPage;
	assert.equal(firstPage.tab, "wallet");
	assert.equal(firstPage.items.length, 1);
	assert.equal(firstPage.pagination.hasMore, true);
	assert.ok(firstPage.pagination.nextCursor);
	assert.equal(firstPage.items[0]?.player.id, playerId);

	const secondPage = (await listAdminActivity({
		tab: "wallet",
		search: playerId,
		limit: 1,
		cursor: firstPage.pagination.nextCursor ?? undefined,
		withdrawalStatus: "all",
	})) as WalletActivityPage;
	assert.equal(secondPage.items.length, 1);
	assert.notEqual(
		secondPage.items[0]?.operation.id,
		firstPage.items[0]?.operation.id,
	);

	const withdrawals = (await listAdminActivity({
		tab: "withdrawals",
		search: playerId,
		limit: 20,
		withdrawalStatus: "pending",
	})) as WithdrawalActivityPage;
	assert.equal(
		withdrawals.items.some(
			(item) => item.withdrawal.id === second.withdrawal.id,
		),
		true,
	);

	const gameplay = (await listAdminActivity({
		tab: "gameplay",
		search: playerId,
		limit: 20,
		withdrawalStatus: "all",
	})) as Extract<
		Awaited<ReturnType<typeof listAdminActivity>>,
		{ tab: "gameplay" }
	>;
	assert.equal(gameplay.items[0]?.operation.type, "bet");

	const audits = (await listAdminActivity({
		tab: "audit",
		search: "Operations test rejection",
		limit: 20,
		withdrawalStatus: "all",
	})) as AuditActivityPage;
	assert.equal(
		audits.items.some((item) => item.action === "withdrawal_rejected"),
		true,
	);
});
