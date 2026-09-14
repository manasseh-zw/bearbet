import "@tanstack/react-start/server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { findGame } from "#/server/domains/game/game.service";
import {
	recordBet,
	recordWin,
} from "#/server/domains/gameplay/gameplay.service";
import { getPlayableBalance } from "#/server/domains/wallet/wallet.service";
import { env } from "#/server/env";
import { db } from "#/server/infra/db";
import {
	gameRound,
	gameSession,
	providerOperation,
} from "#/server/infra/db/schema";
import { resolveDemoGameOutcome } from "./demo-game.policy";

export class DemoGameError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DemoGameError";
	}
}

export async function startDemoGame(input: {
	playerId: string;
	gameId: string;
	launchKey: string;
}) {
	const [game, wallet] = await Promise.all([
		findGame(env.CASINO_PROVIDER, input.gameId),
		getPlayableBalance(input.playerId),
	]);
	if (!game?.isAvailable) throw new DemoGameError("This game is unavailable");

	const session = await db.transaction(async (transaction) => {
		await transaction.execute(
			sql`select pg_advisory_xact_lock(hashtext(${`${env.CASINO_PROVIDER}:${input.playerId}:${input.gameId}`}))`,
		);

		const [activeSession] = await transaction
			.select()
			.from(gameSession)
			.where(
				and(
					eq(gameSession.integrationProvider, env.CASINO_PROVIDER),
					eq(gameSession.playerId, input.playerId),
					eq(gameSession.gameId, input.gameId),
					eq(gameSession.status, "active"),
				),
			)
			.orderBy(desc(gameSession.createdAt))
			.limit(1);
		if (activeSession) return activeSession;

		if (wallet.balanceMinor <= 0)
			throw new DemoGameError("Add funds to your wallet before playing");

		const externalSessionId = `bearbet-demo:${input.launchKey}`;
		const [createdSession] = await transaction
			.insert(gameSession)
			.values({
				playerId: input.playerId,
				integrationProvider: env.CASINO_PROVIDER,
				externalSessionId,
				gameId: input.gameId,
				mode: "real",
				currencyCode: wallet.currencyCode,
			})
			.onConflictDoNothing()
			.returning();
		if (createdSession) return createdSession;

		const [existingSession] = await transaction
			.select()
			.from(gameSession)
			.where(
				and(
					eq(gameSession.integrationProvider, env.CASINO_PROVIDER),
					eq(gameSession.playerId, input.playerId),
					eq(gameSession.externalSessionId, externalSessionId),
				),
			);
		return existingSession;
	});
	if (!session)
		throw new DemoGameError("The game session could not be started");
	return sessionResult(session, game, wallet.balanceMinor);
}

export async function playDemoGame(input: {
	playerId: string;
	sessionId: string;
	stakeMinor: number;
	idempotencyKey: string;
}) {
	const context = await getActiveSession(input.playerId, input.sessionId);
	const game = await findGame(context.integrationProvider, context.gameId);
	if (!game?.isAvailable) throw new DemoGameError("This game is unavailable");

	const result = resolveDemoGameOutcome({
		secret: env.BETTER_AUTH_SECRET,
		playerId: input.playerId,
		sessionId: input.sessionId,
		idempotencyKey: input.idempotencyKey,
		stakeMinor: input.stakeMinor,
	});
	const identity = {
		integrationProvider: context.integrationProvider,
		playerId: input.playerId,
		externalSessionId: context.externalSessionId,
		externalRoundId: `bearbet-demo-round:${input.idempotencyKey}`,
		gameId: context.gameId,
	};
	const bet = await recordBet({
		...identity,
		externalTransactionId: `bearbet-demo-bet:${input.idempotencyKey}`,
		amountMinor: input.stakeMinor,
		gameCategory: game.type,
		contentProvider: game.provider,
	});
	const settlement = await recordWin({
		...identity,
		externalTransactionId: `bearbet-demo-win:${input.idempotencyKey}`,
		betAmountMinor: input.stakeMinor,
		winAmountMinor: result.winAmountMinor,
	});

	return {
		...result,
		stakeMinor: input.stakeMinor,
		netMinor: result.winAmountMinor - input.stakeMinor,
		balanceMinor: settlement.balanceMinor,
		bonusTransition: settlement.bonusTransition,
		currencyCode: context.currencyCode,
		isDuplicate: bet.isDuplicate && settlement.isDuplicate,
	};
}

export async function closeDemoGame(input: {
	playerId: string;
	sessionId: string;
}) {
	const [session] = await db
		.select()
		.from(gameSession)
		.where(
			and(
				eq(gameSession.id, input.sessionId),
				eq(gameSession.playerId, input.playerId),
			),
		);
	if (!session) throw new DemoGameError("Game session was not found");

	if (session.status === "active") {
		await db
			.update(gameSession)
			.set({ status: "closed", closedAt: new Date() })
			.where(
				and(
					eq(gameSession.id, input.sessionId),
					eq(gameSession.playerId, input.playerId),
					eq(gameSession.status, "active"),
				),
			);
	}

	const [totals] = await db
		.select({
			stakedMinor: sql<number>`coalesce(sum(case when ${providerOperation.type} = 'bet' then ${providerOperation.amountMinor} else 0 end), 0)`,
			returnedMinor: sql<number>`coalesce(sum(case when ${providerOperation.type} = 'win' then ${providerOperation.amountMinor} else 0 end), 0)`,
			roundsPlayed: sql<number>`count(distinct ${gameRound.id})`,
		})
		.from(gameRound)
		.leftJoin(providerOperation, eq(providerOperation.roundId, gameRound.id))
		.where(eq(gameRound.sessionId, input.sessionId));
	const wallet = await getPlayableBalance(input.playerId);
	const stakedMinor = Number(totals?.stakedMinor ?? 0);
	const returnedMinor = Number(totals?.returnedMinor ?? 0);

	return {
		sessionId: input.sessionId,
		currencyCode: wallet.currencyCode,
		balanceMinor: wallet.balanceMinor,
		stakedMinor,
		returnedMinor,
		netMinor: returnedMinor - stakedMinor,
		roundsPlayed: Number(totals?.roundsPlayed ?? 0),
	};
}

async function getActiveSession(playerId: string, sessionId: string) {
	const [session] = await db
		.select()
		.from(gameSession)
		.where(
			and(
				eq(gameSession.id, sessionId),
				eq(gameSession.playerId, playerId),
				eq(gameSession.status, "active"),
			),
		);
	if (!session) throw new DemoGameError("This game session has ended");
	return session;
}

function sessionResult(
	session: typeof gameSession.$inferSelect,
	game: NonNullable<Awaited<ReturnType<typeof findGame>>>,
	balanceMinor: number,
) {
	return {
		sessionId: session.id,
		game: {
			id: game.id,
			name: game.name,
			provider: game.provider,
			type: game.type,
			imageUrl: game.bannerUrl ?? game.coverUrl,
		},
		currencyCode: session.currencyCode,
		balanceMinor,
	};
}
