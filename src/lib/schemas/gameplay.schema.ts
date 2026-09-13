import { z } from "zod";

import { idempotencyKeySchema } from "./idempotency.schema";

export const startDemoGameInputSchema = z
	.object({
		gameId: z.string().trim().min(1).max(200),
		launchKey: idempotencyKeySchema,
	})
	.strict();

export const playDemoGameInputSchema = z
	.object({
		sessionId: z.string().uuid(),
		stakeMinor: z.number().int().positive().max(100_000_000),
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

export const closeDemoGameInputSchema = z
	.object({
		sessionId: z.string().uuid(),
	})
	.strict();

export type StartDemoGameInput = z.input<typeof startDemoGameInputSchema>;
export type PlayDemoGameInput = z.input<typeof playDemoGameInputSchema>;
export type CloseDemoGameInput = z.input<typeof closeDemoGameInputSchema>;
