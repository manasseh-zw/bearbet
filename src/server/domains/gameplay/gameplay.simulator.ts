import "@tanstack/react-start/server-only";

import { recordBet, recordRefund, recordWin } from "./gameplay.service";
import {
	type SimulateGameRoundInput,
	simulateGameRoundSchema,
} from "./gameplay.simulator.schema";

export async function simulateGameRound(input: SimulateGameRoundInput) {
	const parsed = simulateGameRoundSchema.safeParse(input);
	if (!parsed.success) {
		const missingWinAmount = parsed.error.issues.some(
			(issue) => issue.path[0] === "winAmountMinor",
		);
		throw new Error(
			missingWinAmount
				? "A winning simulation needs a win amount"
				: (parsed.error.issues[0]?.message ?? "Simulation input is invalid"),
		);
	}
	const command = parsed.data;
	const identity = {
		integrationProvider: "fixture",
		playerId: command.playerId,
		externalSessionId: `fixture-session:${command.runId}`,
		externalRoundId: `fixture-round:${command.runId}`,
		gameId: command.gameId,
	};
	const bet = await recordBet({
		...identity,
		externalTransactionId: `fixture-bet:${command.runId}`,
		amountMinor: command.stakeMinor,
		gameCategory: command.gameCategory,
		contentProvider: command.contentProvider,
	});

	if (command.outcome === "refund") {
		const settlement = await recordRefund({
			...identity,
			externalTransactionId: `fixture-refund:${command.runId}`,
			amountMinor: command.stakeMinor,
		});
		return { bet, settlement };
	}
	const settlement = await recordWin({
		...identity,
		externalTransactionId: `fixture-win:${command.runId}`,
		betAmountMinor: command.stakeMinor,
		winAmountMinor: command.outcome === "loss" ? 0 : command.winAmountMinor,
	});
	return { bet, settlement };
}
