import { createHmac } from "node:crypto";

export const DEMO_WINNING_NUMBERS = 45;
export const DEMO_DRAW_SIZE = 100;
export const DEMO_WIN_MULTIPLIER = 2;

export type DemoGameOutcome = {
	draw: number;
	outcome: "win" | "loss";
	winAmountMinor: number;
};

export function resolveDemoGameOutcome(input: {
	secret: string;
	playerId: string;
	sessionId: string;
	idempotencyKey: string;
	stakeMinor: number;
}): DemoGameOutcome {
	const digest = createHmac("sha256", input.secret)
		.update(
			`${input.playerId}:${input.sessionId}:${input.idempotencyKey}:${input.stakeMinor}`,
		)
		.digest();
	const draw = (digest.readUInt32BE(0) % DEMO_DRAW_SIZE) + 1;
	const won = draw <= DEMO_WINNING_NUMBERS;

	return {
		draw,
		outcome: won ? "win" : "loss",
		winAmountMinor: won ? input.stakeMinor * DEMO_WIN_MULTIPLIER : 0,
	};
}
