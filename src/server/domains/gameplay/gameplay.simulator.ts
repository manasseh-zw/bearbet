import "@tanstack/react-start/server-only";

import { recordBet, recordRefund, recordWin } from "./gameplay.service";

export async function simulateGameRound(input: {
	playerId: string;
	gameId: string;
	runId: string;
	stakeMinor: number;
	outcome: "loss" | "refund" | "win";
	winAmountMinor?: number;
	gameCategory?: string;
	contentProvider?: string;
}) {
	if (input.outcome === "win" && input.winAmountMinor === undefined) {
		throw new Error("A winning simulation needs a win amount");
	}
	const identity = {
		integrationProvider: "fixture",
		playerId: input.playerId,
		externalSessionId: `fixture-session:${input.runId}`,
		externalRoundId: `fixture-round:${input.runId}`,
		gameId: input.gameId,
	};
	const bet = await recordBet({
		...identity,
		externalTransactionId: `fixture-bet:${input.runId}`,
		amountMinor: input.stakeMinor,
		gameCategory: input.gameCategory,
		contentProvider: input.contentProvider,
	});

	if (input.outcome === "refund") {
		const result = await recordRefund({
			...identity,
			externalTransactionId: `fixture-refund:${input.runId}`,
			amountMinor: input.stakeMinor,
		});
		return { bet, settlement: result };
	}
	const result = await recordWin({
		...identity,
		externalTransactionId: `fixture-win:${input.runId}`,
		betAmountMinor: input.stakeMinor,
		winAmountMinor: input.outcome === "loss" ? 0 : (input.winAmountMinor ?? 0),
	});
	return { bet, settlement: result };
}
