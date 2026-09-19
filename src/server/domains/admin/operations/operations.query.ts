import "@tanstack/react-start/server-only";

import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	lt,
	or,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
	type AdminActivityQuery,
	type AdminWithdrawalQuery,
	adminActivityQuerySchema,
	adminWithdrawalQuerySchema,
} from "#/lib/schemas/admin-operations.schema";
import { db } from "#/server/infra/db";
import {
	adminAuditEntry,
	game,
	gameRound,
	ledgerEntry,
	player,
	providerOperation,
	user,
	wallet,
	walletOperation,
	withdrawal,
} from "#/server/infra/db/schema";

const GAMEPLAY_TYPES = ["bet", "win", "refund"] as const;

export async function listAdminWithdrawals(input: AdminWithdrawalQuery) {
	const query = adminWithdrawalQuerySchema.parse(input);
	const conditions = withdrawalConditions(query);
	const where = conditions.length ? and(...conditions) : undefined;
	const reviewer = alias(user, "reviewer");

	const [totalResult] = await db
		.select({ value: count() })
		.from(withdrawal)
		.innerJoin(user, eq(user.id, withdrawal.playerId))
		.leftJoin(player, eq(player.userId, withdrawal.playerId))
		.where(where);
	const total = totalResult?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
	const page = Math.min(query.page, totalPages);
	const rows = await db
		.select({
			withdrawal: {
				id: withdrawal.id,
				currencyCode: withdrawal.currencyCode,
				requestedAmountMinor: withdrawal.requestedAmountMinor,
				reservedAmountMinor: withdrawal.reservedAmountMinor,
				requestedAt: withdrawal.requestedAt,
			},
			player: {
				id: user.id,
				name: user.name,
				email: user.email,
				username: user.username,
				status: user.banned,
				firstName: player.firstName,
				lastName: player.lastName,
			},
			wallet: {
				cashBalanceMinor: wallet.cashBalanceMinor,
				bonusBalanceMinor: wallet.bonusBalanceMinor,
				reservedCashMinor: wallet.reservedCashMinor,
			},
			decision: {
				status: withdrawal.status,
				reason: withdrawal.reviewReason,
				reviewedAt: withdrawal.reviewedAt,
				reviewerId: reviewer.id,
				reviewerName: reviewer.name,
				reviewerEmail: reviewer.email,
			},
		})
		.from(withdrawal)
		.innerJoin(user, eq(user.id, withdrawal.playerId))
		.leftJoin(player, eq(player.userId, withdrawal.playerId))
		.innerJoin(wallet, eq(wallet.playerId, withdrawal.playerId))
		.leftJoin(reviewer, eq(reviewer.id, withdrawal.reviewerUserId))
		.where(where)
		.orderBy(
			query.direction === "asc"
				? asc(withdrawal.requestedAt)
				: desc(withdrawal.requestedAt),
			query.direction === "asc" ? asc(withdrawal.id) : desc(withdrawal.id),
		)
		.limit(query.pageSize)
		.offset((page - 1) * query.pageSize);

	return {
		items: rows.map((row) => ({
			withdrawal: row.withdrawal,
			player: {
				...row.player,
				status: row.player.status
					? ("suspended" as const)
					: ("active" as const),
			},
			wallet: row.wallet,
			decision: {
				status: row.decision.status,
				reason: row.decision.reason,
				reviewedAt: row.decision.reviewedAt,
				reviewer:
					row.decision.reviewerId && row.decision.reviewerName
						? {
								id: row.decision.reviewerId,
								name: row.decision.reviewerName,
								email: row.decision.reviewerEmail,
							}
						: null,
			},
		})),
		pagination: { page, pageSize: query.pageSize, total, totalPages },
	};
}

export async function listAdminActivity(input: AdminActivityQuery) {
	const query = adminActivityQuerySchema.parse(input);

	switch (query.tab) {
		case "wallet":
			return listWalletActivity(query);
		case "gameplay":
			return listGameplayActivity(query);
		case "withdrawals":
			return listWithdrawalActivity(query);
		case "audit":
			return listAuditActivity(query);
	}
}

async function listWalletActivity(query: AdminActivityQuery) {
	const cursor = readCursor(query.cursor);
	const actor = alias(user, "wallet_actor");
	const conditions = [
		...playerSearchConditions(query.search),
		...(query.type ? [eq(walletOperation.type, query.type)] : []),
		...(cursor
			? [
					or(
						lt(walletOperation.createdAt, cursor.createdAt),
						and(
							eq(walletOperation.createdAt, cursor.createdAt),
							lt(walletOperation.id, cursor.id),
						),
					),
				]
			: []),
	];
	const rows = await db
		.select({
			operation: {
				id: walletOperation.id,
				publicReference: walletOperation.publicReference,
				type: walletOperation.type,
				sourceType: walletOperation.sourceType,
				sourceId: walletOperation.sourceId,
				createdAt: walletOperation.createdAt,
			},
			player: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			wallet: {
				currencyCode: wallet.currencyCode,
				cashBalanceMinor: walletOperation.resultCashBalanceMinor,
				bonusBalanceMinor: walletOperation.resultBonusBalanceMinor,
				reservedCashMinor: walletOperation.resultReservedCashMinor,
			},
			actor: { id: actor.id, name: actor.name, email: actor.email },
		})
		.from(walletOperation)
		.innerJoin(wallet, eq(wallet.id, walletOperation.walletId))
		.innerJoin(user, eq(user.id, wallet.playerId))
		.leftJoin(actor, eq(actor.id, walletOperation.actorUserId))
		.where(and(...conditions))
		.orderBy(desc(walletOperation.createdAt), desc(walletOperation.id))
		.limit(query.limit + 1);

	const visibleRows = rows.slice(0, query.limit);
	const movements = await getLedgerMovements(
		visibleRows.map((row) => row.operation.id),
	);
	const hasMore = rows.length > query.limit;

	return {
		tab: "wallet" as const,
		items: visibleRows.map((row) => ({
			...row,
			actor: row.actor?.id
				? { id: row.actor.id, name: row.actor.name, email: row.actor.email }
				: null,
			amountMinor: displayActivityAmount(movements.get(row.operation.id) ?? []),
			movements: movements.get(row.operation.id) ?? [],
		})),
		pagination: activityPagination(visibleRows, hasMore, query.limit),
	};
}

async function listGameplayActivity(query: AdminActivityQuery) {
	const cursor = readCursor(query.cursor);
	const conditions = [
		...playerSearchConditions(query.search),
		...(isGameplayType(query.type)
			? [eq(providerOperation.type, query.type)]
			: []),
		...(cursor
			? [
					or(
						lt(providerOperation.createdAt, cursor.createdAt),
						and(
							eq(providerOperation.createdAt, cursor.createdAt),
							lt(providerOperation.id, cursor.id),
						),
					),
				]
			: []),
	];
	const rows = await db
		.select({
			operation: {
				id: providerOperation.id,
				type: providerOperation.type,
				status: providerOperation.status,
				externalTransactionId: providerOperation.externalTransactionId,
				amountMinor: providerOperation.amountMinor,
				cashAmountMinor: providerOperation.cashAmountMinor,
				bonusAmountMinor: providerOperation.bonusAmountMinor,
				wageringContributionMinor: providerOperation.wageringContributionMinor,
				createdAt: providerOperation.createdAt,
			},
			player: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			wallet: { currencyCode: wallet.currencyCode },
			game: {
				name: game.name,
				gameId: gameRound.gameId,
				roundReference: gameRound.externalRoundId,
			},
			walletReference: walletOperation.publicReference,
		})
		.from(providerOperation)
		.innerJoin(gameRound, eq(gameRound.id, providerOperation.roundId))
		.innerJoin(user, eq(user.id, providerOperation.playerId))
		.innerJoin(wallet, eq(wallet.playerId, providerOperation.playerId))
		.leftJoin(
			game,
			and(
				eq(game.externalId, gameRound.gameId),
				eq(game.providerId, providerOperation.integrationProvider),
			),
		)
		.leftJoin(
			walletOperation,
			eq(walletOperation.id, providerOperation.walletOperationId),
		)
		.where(and(...conditions))
		.orderBy(desc(providerOperation.createdAt), desc(providerOperation.id))
		.limit(query.limit + 1);

	const visibleRows = rows.slice(0, query.limit);
	const hasMore = rows.length > query.limit;

	return {
		tab: "gameplay" as const,
		items: visibleRows,
		pagination: activityPagination(visibleRows, hasMore, query.limit),
	};
}

async function listWithdrawalActivity(query: AdminActivityQuery) {
	const cursor = readCursor(query.cursor);
	const conditions = [
		...playerSearchConditions(query.search),
		...(query.withdrawalStatus !== "all"
			? [eq(withdrawal.status, query.withdrawalStatus)]
			: []),
		...(cursor
			? [
					or(
						lt(withdrawal.requestedAt, cursor.createdAt),
						and(
							eq(withdrawal.requestedAt, cursor.createdAt),
							lt(withdrawal.id, cursor.id),
						),
					),
				]
			: []),
	];
	const reviewer = alias(user, "withdrawal_reviewer");
	const rows = await db
		.select({
			withdrawal: {
				id: withdrawal.id,
				currencyCode: withdrawal.currencyCode,
				requestedAmountMinor: withdrawal.requestedAmountMinor,
				reservedAmountMinor: withdrawal.reservedAmountMinor,
				requestedAt: withdrawal.requestedAt,
			},
			player: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			wallet: {
				cashBalanceMinor: wallet.cashBalanceMinor,
				reservedCashMinor: wallet.reservedCashMinor,
			},
			decision: {
				status: withdrawal.status,
				reason: withdrawal.reviewReason,
				reviewedAt: withdrawal.reviewedAt,
				reviewerId: reviewer.id,
				reviewerName: reviewer.name,
			},
		})
		.from(withdrawal)
		.innerJoin(user, eq(user.id, withdrawal.playerId))
		.innerJoin(wallet, eq(wallet.playerId, withdrawal.playerId))
		.leftJoin(reviewer, eq(reviewer.id, withdrawal.reviewerUserId))
		.where(and(...conditions))
		.orderBy(desc(withdrawal.requestedAt), desc(withdrawal.id))
		.limit(query.limit + 1);

	const visibleRows = rows.slice(0, query.limit);
	const hasMore = rows.length > query.limit;

	return {
		tab: "withdrawals" as const,
		items: visibleRows.map((row) => ({
			...row,
			decision: {
				status: row.decision.status,
				reason: row.decision.reason,
				reviewedAt: row.decision.reviewedAt,
				reviewer: row.decision.reviewerId
					? {
							id: row.decision.reviewerId,
							name: row.decision.reviewerName,
						}
					: null,
			},
		})),
		pagination: activityPagination(visibleRows, hasMore, query.limit),
	};
}

async function listAuditActivity(query: AdminActivityQuery) {
	const cursor = readCursor(query.cursor);
	const actor = alias(user, "audit_actor");
	const conditions = [
		...(query.search
			? [
					or(
						ilike(actor.name, `%${query.search}%`),
						ilike(actor.email, `%${query.search}%`),
						ilike(adminAuditEntry.action, `%${query.search}%`),
						ilike(adminAuditEntry.reason, `%${query.search}%`),
						sql`${adminAuditEntry.targetId} ILIKE ${`%${query.search}%`}`,
					),
				]
			: []),
		...(cursor
			? [
					or(
						lt(adminAuditEntry.createdAt, cursor.createdAt),
						and(
							eq(adminAuditEntry.createdAt, cursor.createdAt),
							lt(adminAuditEntry.id, cursor.id),
						),
					),
				]
			: []),
	];
	const rows = await db
		.select({
			id: adminAuditEntry.id,
			targetType: adminAuditEntry.targetType,
			targetId: adminAuditEntry.targetId,
			action: adminAuditEntry.action,
			reason: adminAuditEntry.reason,
			metadata: adminAuditEntry.metadata,
			createdAt: adminAuditEntry.createdAt,
			actor: { id: actor.id, name: actor.name, email: actor.email },
		})
		.from(adminAuditEntry)
		.innerJoin(actor, eq(actor.id, adminAuditEntry.actorUserId))
		.where(and(...conditions))
		.orderBy(desc(adminAuditEntry.createdAt), desc(adminAuditEntry.id))
		.limit(query.limit + 1);

	const visibleRows = rows.slice(0, query.limit);
	const hasMore = rows.length > query.limit;

	return {
		tab: "audit" as const,
		items: visibleRows.map((row) => ({
			...row,
			metadata: JSON.stringify(row.metadata),
		})),
		pagination: activityPagination(visibleRows, hasMore, query.limit),
	};
}

function withdrawalConditions(query: AdminWithdrawalQuery) {
	const conditions = [];
	if (query.status !== "all")
		conditions.push(eq(withdrawal.status, query.status));
	if (query.search) {
		const pattern = `%${query.search}%`;
		conditions.push(
			or(
				ilike(user.name, pattern),
				ilike(user.email, pattern),
				ilike(user.username, pattern),
				ilike(player.firstName, pattern),
				ilike(player.lastName, pattern),
				sql`${withdrawal.id}::text ILIKE ${pattern}`,
			),
		);
	}
	return conditions;
}

function playerSearchConditions(search: string) {
	if (!search) return [];
	const pattern = `%${search}%`;
	return [
		or(
			ilike(user.name, pattern),
			ilike(user.email, pattern),
			ilike(user.username, pattern),
		),
	];
}

async function getLedgerMovements(operationIds: string[]) {
	if (operationIds.length === 0) return new Map<string, LedgerMovement[]>();
	const entries = await db
		.select({
			operationId: ledgerEntry.operationId,
			bucket: ledgerEntry.bucket,
			amountMinor: ledgerEntry.amountMinor,
		})
		.from(ledgerEntry)
		.where(inArray(ledgerEntry.operationId, operationIds))
		.orderBy(asc(ledgerEntry.movementIndex));
	const grouped = new Map<string, LedgerMovement[]>();
	for (const entry of entries) {
		if (!entry.operationId) continue;
		const movements = grouped.get(entry.operationId) ?? [];
		movements.push(entry);
		grouped.set(entry.operationId, movements);
	}
	return grouped;
}

function displayActivityAmount(movements: LedgerMovement[]) {
	const cashMovement = movements.find((movement) => movement.bucket === "cash");
	if (cashMovement && cashMovement.amountMinor !== 0)
		return cashMovement.amountMinor;
	return (
		movements.find((movement) => movement.amountMinor !== 0)?.amountMinor ?? 0
	);
}

function isGameplayType(
	type: AdminActivityQuery["type"],
): type is (typeof GAMEPLAY_TYPES)[number] {
	return (
		type !== undefined &&
		GAMEPLAY_TYPES.includes(type as (typeof GAMEPLAY_TYPES)[number])
	);
}

function activityPagination(
	rows: Array<{
		id?: string;
		operation?: { id: string; createdAt: Date };
		withdrawal?: { id: string; requestedAt: Date };
		createdAt?: Date;
	}>,
	hasMore: boolean,
	limit: number,
) {
	const last = rows.at(-1);
	const id = last?.operation?.id ?? last?.withdrawal?.id ?? last?.id;
	const createdAt =
		last?.operation?.createdAt ??
		last?.withdrawal?.requestedAt ??
		last?.createdAt;
	return {
		limit,
		hasMore,
		nextCursor: hasMore && id && createdAt ? encodeCursor(createdAt, id) : null,
	};
}

type LedgerMovement = {
	bucket: "cash" | "bonus" | "reserved_cash";
	amountMinor: number;
};

type ActivityCursor = { createdAt: Date; id: string };

function readCursor(value: string | undefined): ActivityCursor | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(
			Buffer.from(value, "base64url").toString("utf8"),
		) as {
			createdAt?: unknown;
			id?: unknown;
		};
		if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
			throw new Error("Invalid cursor");
		}
		const createdAt = new Date(parsed.createdAt);
		if (!parsed.id || Number.isNaN(createdAt.getTime()))
			throw new Error("Invalid cursor");
		return { createdAt, id: parsed.id };
	} catch {
		throw new Error("The activity cursor is invalid");
	}
}

function encodeCursor(createdAt: Date, id: string) {
	return Buffer.from(
		JSON.stringify({ createdAt: createdAt.toISOString(), id }),
	).toString("base64url");
}
