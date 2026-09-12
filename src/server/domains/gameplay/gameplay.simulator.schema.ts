import "@tanstack/react-start/server-only";

import { z } from "zod";

const simulationIdentitySchema = z.object({
	playerId: z.string().trim().min(1),
	gameId: z.string().trim().min(1),
	runId: z.string().trim().min(1),
	stakeMinor: z
		.number()
		.refine((value) => Number.isSafeInteger(value) && value > 0, {
			message: "Stake must be a positive safe integer",
		}),
	gameCategory: z.string().optional(),
	contentProvider: z.string().optional(),
});

export const simulateGameRoundSchema = z.discriminatedUnion("outcome", [
	simulationIdentitySchema.extend({
		outcome: z.literal("loss"),
		winAmountMinor: z.never().optional(),
	}),
	simulationIdentitySchema.extend({
		outcome: z.literal("refund"),
		winAmountMinor: z.never().optional(),
	}),
	simulationIdentitySchema.extend({
		outcome: z.literal("win"),
		winAmountMinor: z
			.number()
			.refine((value) => Number.isSafeInteger(value) && value >= 0, {
				message: "Win amount must be a non-negative safe integer",
			}),
	}),
]);

export type SimulateGameRoundInput = z.input<typeof simulateGameRoundSchema>;
export type SimulateGameRoundCommand = z.output<typeof simulateGameRoundSchema>;
