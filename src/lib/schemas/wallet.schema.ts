import { z } from "zod";

import { idempotencyKeySchema } from "./idempotency.schema";

export const DEMO_TOP_UP_AMOUNTS_MINOR = [
	10_000, 50_000, 100_000, 1_000_000,
] as const;

export const demoTopUpInputSchema = z
	.object({
		amountMinor: z
			.number()
			.refine(
				(value) =>
					DEMO_TOP_UP_AMOUNTS_MINOR.includes(
						value as (typeof DEMO_TOP_UP_AMOUNTS_MINOR)[number],
					),
				{ message: "Choose a supported demo top-up amount" },
			),
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();
export type DemoTopUpInput = z.input<typeof demoTopUpInputSchema>;
