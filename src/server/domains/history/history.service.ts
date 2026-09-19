import "@tanstack/react-start/server-only";

import {
	and,
	asc,
	countDistinct,
	desc,
	eq,
	gte,
	inArray,
	notInArray,
	sql,
} from "drizzle-orm";

import {
	type HistoryCategory,
	type HistoryQuery,
	type HistoryQueryInput,
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

export async function getPlayerHistory(
	playerId: string,
	input: HistoryQueryInput,
) {
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
	if (query.category === "bet") {
		return getPlayerBetRoundHistory({
			playerId,
			walletId: current.wallet.id,
			currencyCode: current.wallet.currencyCode,
			query,
		});
	}

	const conditions = [eq(walletOperation.walletId, current.wallet.id)];
	const categoryCondition = conditionForCategory(query.category);
	if (categoryCondition) conditions.push(categoryCondition);
	if (query.types.length) {
		conditions.push(inArray(walletOperation.type, query.types));
	} else if (query.type) {
		conditions.push(eq(walletOperation.type, query.type));
	}
	if (query.bucket) conditions.push(eq(ledgerEntry.bucket, query.bucket));
	if (query.timeRange === "today") {
		const startOfToday = new Date();
		startOfToday.setUTCHours(0, 0, 0, 0);
		conditions.push(gte(walletOperation.createdAt, startOfToday));
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
	const createdAtOrder =
		query.direction === "asc"
			? asc(walletOperation.createdAt)
			: desc(walletOperation.createdAt);
	const idOrder =
		query.direction === "asc"
			? asc(walletOperation.id)
			: desc(walletOperation.id);
	const operations = await db
		.select({
			id: walletOperation.id,
			publicReference: walletOperation.publicReference,
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
		.orderBy(createdAtOrder, idOrder)
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
		betRounds: [],
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

async function getPlayerBetRoundHistory(input: {
	playerId: string;
	walletId: string;
	currencyCode: string;
	query: HistoryQuery;
}) {
	const roundConditions = [eq(gameRound.playerId, input.playerId)];
	if (input.query.timeRange === "today") {
		const startOfToday = new Date();
		startOfToday.setUTCHours(0, 0, 0, 0);
		roundConditions.push(gte(gameRound.createdAt, startOfToday));
	}
	const [totalResult, typeCounts] = await Promise.all([
		db
			.select({ count: countDistinct(gameRound.id) })
			.from(gameRound)
			.innerJoin(
				providerOperation,
				and(
					eq(providerOperation.roundId, gameRound.id),
					eq(providerOperation.type, "bet"),
				),
			)
			.where(and(...roundConditions)),
		db
			.select({
				type: walletOperation.type,
				count: countDistinct(walletOperation.id),
			})
			.from(walletOperation)
			.where(eq(walletOperation.walletId, input.walletId))
			.groupBy(walletOperation.type),
	]);
	const total = totalResult[0]?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(input.query.page, totalPages);
	const createdAtOrder =
		input.query.direction === "asc"
			? asc(gameRound.createdAt)
			: desc(gameRound.createdAt);
	const idOrder =
		input.query.direction === "asc" ? asc(gameRound.id) : desc(gameRound.id);
	const rounds = await db
		.select({
			id: gameRound.id,
			gameId: gameRound.gameId,
			gameName: game.name,
			provider: gameRound.integrationProvider,
			roundReference: gameRound.externalRoundId,
			status: gameRound.status,
			createdAt: gameRound.createdAt,
			publicReference: sql<string>`max(case when ${providerOperation.type} = 'bet' then ${walletOperation.publicReference} end)`,
			stakeMinor: sql<number>`coalesce(sum(case when ${providerOperation.type} = 'bet' then ${providerOperation.amountMinor} else 0 end), 0)`,
			returnedMinor: sql<number>`coalesce(sum(case when ${providerOperation.type} = 'win' then ${providerOperation.amountMinor} else 0 end), 0)`,
			refundedMinor: sql<number>`coalesce(sum(case when ${providerOperation.type} = 'refund' then ${providerOperation.amountMinor} else 0 end), 0)`,
		})
		.from(gameRound)
		.innerJoin(providerOperation, eq(providerOperation.roundId, gameRound.id))
		.leftJoin(
			walletOperation,
			sql`${providerOperation.id}::text = ${walletOperation.sourceId}`,
		)
		.leftJoin(
			game,
			and(
				eq(game.externalId, gameRound.gameId),
				eq(game.providerId, gameRound.integrationProvider),
			),
		)
		.where(and(...roundConditions))
		.groupBy(gameRound.id, game.id)
		.having(sql`count(*) filter (where ${providerOperation.type} = 'bet') > 0`)
		.orderBy(createdAtOrder, idOrder)
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE);
	const roundMovements = rounds.length
		? await db
				.select({
					roundId: providerOperation.roundId,
					amountMinor: ledgerEntry.amountMinor,
				})
				.from(providerOperation)
				.innerJoin(
					walletOperation,
					sql`${providerOperation.id}::text = ${walletOperation.sourceId}`,
				)
				.innerJoin(ledgerEntry, eq(ledgerEntry.operationId, walletOperation.id))
				.where(
					inArray(
						providerOperation.roundId,
						rounds.map((round) => round.id),
					),
				)
		: [];
	const netByRound = new Map<string, number>();
	for (const movement of roundMovements) {
		netByRound.set(
			movement.roundId,
			(netByRound.get(movement.roundId) ?? 0) + movement.amountMinor,
		);
	}

	return {
		currencyCode: input.currencyCode,
		items: [],
		betRounds: rounds.map((round) => {
			const stakeMinor = Number(round.stakeMinor);
			const returnedMinor = Number(round.returnedMinor);
			const refundedMinor = Number(round.refundedMinor);
			const outcome =
				refundedMinor > 0
					? ("refunded" as const)
					: round.status === "open"
						? ("pending" as const)
						: returnedMinor > 0
							? ("won" as const)
							: ("lost" as const);
			return {
				...round,
				stakeMinor,
				returnedMinor,
				refundedMinor,
				outcome,
				netMinor: netByRound.get(round.id) ?? 0,
			};
		}),
		counts: historyCounts(typeCounts),
		pagination: { page, pageSize: PAGE_SIZE, total, totalPages },
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
