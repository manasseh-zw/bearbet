import "@tanstack/react-start/server-only";

import {
	and,
	asc,
	countDistinct,
	desc,
	eq,
	gte,
	inArray,
	lte,
	notInArray,
	sql,
} from "drizzle-orm";

import {
	type HistoryCategory,
	type HistoryQuery,
	historyQuerySchema,
} from "#/lib/schemas/history.schema";
import { WalletOperationError } from "#/server/domains/wallet/wallet.service";
import { db } from "#/server/infra/db";
import {
	game,
	gameRound,
	ledgerEntry,
	providerOperation,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

const PAGE_SIZE = 10;
const GAMEPLAY_TYPES: (typeof walletOperation.$inferSelect)["type"][] = [
	"bet",
	"win",
	"refund",
];

type HistoryMovement = {
	operationId: string | null;
	bucket: (typeof ledgerEntry.$inferSelect)["bucket"];
	amountMinor: number;
	balanceBeforeMinor: number;
	balanceAfterMinor: number;
	movementIndex: number | null;
};

export async function getPlayerHistory(playerId: string, input: HistoryQuery) {
	const query = historyQuerySchema.parse(input);
	const [current] = await db
		.select({ wallet, banned: user.banned })
		.from(wallet)
		.innerJoin(user, eq(user.id, wallet.playerId))
		.where(eq(wallet.playerId, playerId));

	if (!current || current.banned) {
		throw new WalletOperationError(
			"Active player wallet was not found",
			"WALLET_NOT_FOUND",
		);
	}

	const conditions = [eq(walletOperation.walletId, current.wallet.id)];
	const categoryCondition = conditionForCategory(query.category);
	if (categoryCondition) conditions.push(categoryCondition);
	if (query.type) conditions.push(eq(walletOperation.type, query.type));
	if (query.bucket) conditions.push(eq(ledgerEntry.bucket, query.bucket));
	if (query.from) {
		conditions.push(
			gte(walletOperation.createdAt, new Date(`${query.from}T00:00:00.000Z`)),
		);
	}
	if (query.to) {
		conditions.push(
			lte(walletOperation.createdAt, new Date(`${query.to}T23:59:59.999Z`)),
		);
	}

	const filtered = and(...conditions);
	const [totalResult, typeCounts] = await Promise.all([
		db
			.select({ count: countDistinct(walletOperation.id) })
			.from(walletOperation)
			.innerJoin(ledgerEntry, eq(ledgerEntry.operationId, walletOperation.id))
			.where(filtered),
		db
			.select({
				type: walletOperation.type,
				count: countDistinct(walletOperation.id),
			})
			.from(walletOperation)
			.where(eq(walletOperation.walletId, current.wallet.id))
			.groupBy(walletOperation.type),
	]);

	const total = totalResult[0]?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(query.page, totalPages);
	const operations = await db
		.select({
			id: walletOperation.id,
			type: walletOperation.type,
			sourceType: walletOperation.sourceType,
			sourceId: walletOperation.sourceId,
			createdAt: walletOperation.createdAt,
			gameId: gameRound.gameId,
			gameName: game.name,
			provider: providerOperation.integrationProvider,
			providerReference: providerOperation.externalTransactionId,
			roundReference: gameRound.externalRoundId,
		})
		.from(walletOperation)
		.innerJoin(ledgerEntry, eq(ledgerEntry.operationId, walletOperation.id))
		.leftJoin(
			providerOperation,
			sql`${providerOperation.id}::text = ${walletOperation.sourceId}`,
		)
		.leftJoin(gameRound, eq(gameRound.id, providerOperation.roundId))
		.leftJoin(
			game,
			and(
				eq(game.externalId, gameRound.gameId),
				eq(game.providerId, providerOperation.integrationProvider),
			),
		)
		.where(filtered)
		.groupBy(walletOperation.id, providerOperation.id, gameRound.id, game.id)
		.orderBy(desc(walletOperation.createdAt), desc(walletOperation.id))
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE);

	const entries: HistoryMovement[] = operations.length
		? await db
				.select({
					operationId: ledgerEntry.operationId,
					bucket: ledgerEntry.bucket,
					amountMinor: ledgerEntry.amountMinor,
					balanceBeforeMinor: ledgerEntry.balanceBeforeMinor,
					balanceAfterMinor: ledgerEntry.balanceAfterMinor,
					movementIndex: ledgerEntry.movementIndex,
				})
				.from(ledgerEntry)
				.where(
					inArray(
						ledgerEntry.operationId,
						operations.map((operation) => operation.id),
					),
				)
				.orderBy(asc(ledgerEntry.movementIndex))
		: [];

	const entriesByOperation = new Map<string, HistoryMovement[]>();
	for (const entry of entries) {
		if (!entry.operationId) continue;
		const group = entriesByOperation.get(entry.operationId) ?? [];
		group.push(entry);
		entriesByOperation.set(entry.operationId, group);
	}
	const counts = historyCounts(typeCounts);

	return {
		currencyCode: current.wallet.currencyCode,
		items: operations.map((operation) => {
			const movements = entriesByOperation.get(operation.id) ?? [];
			return {
				...operation,
				amountMinor: displayAmount(operation.type, movements),
				buckets: [...new Set(movements.map((movement) => movement.bucket))],
				movements,
			};
		}),
		counts,
		pagination: {
			page,
			pageSize: PAGE_SIZE,
			total,
			totalPages,
		},
	};
}

function conditionForCategory(category: HistoryCategory) {
	switch (category) {
		case "all":
			return undefined;
		case "wallet":
			return notInArray(walletOperation.type, GAMEPLAY_TYPES);
		case "bet":
		case "win":
		case "refund":
			return eq(walletOperation.type, category);
	}
}

function historyCounts(
	rows: {
		type: (typeof walletOperation.$inferSelect)["type"];
		count: number;
	}[],
) {
	const byType = new Map(rows.map((row) => [row.type, row.count]));
	const bet = byType.get("bet") ?? 0;
	const win = byType.get("win") ?? 0;
	const refund = byType.get("refund") ?? 0;
	const all = rows.reduce((sum, row) => sum + row.count, 0);
	return { all, wallet: all - bet - win - refund, bet, win, refund };
}

function displayAmount(
	type: (typeof walletOperation.$inferSelect)["type"],
	movements: HistoryMovement[],
) {
	const cashMovement = movements.find((movement) => movement.bucket === "cash");
	if (
		type === "withdrawal_reserve" ||
		type === "withdrawal_release" ||
		type === "bonus_conversion"
	) {
		return cashMovement?.amountMinor ?? 0;
	}
	return movements.reduce((sum, movement) => sum + movement.amountMinor, 0);
}
