import { z } from "zod";

export const DEMO_TOP_UP_AMOUNTS_MINOR = [
	10_000, 50_000, 100_000, 1_000_000,
] as const;

const idempotencyKeySchema = z
	.string()
	.trim()
	.min(1, "An idempotency key is required")
	.max(200, "Idempotency key is too long");

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

export const withdrawalRequestInputSchema = z
	.object({
		amountMinor: z
			.number()
			.refine((value) => Number.isSafeInteger(value) && value > 0, {
				message: "Amount must be a positive safe integer",
			}),
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

export type DemoTopUpInput = z.input<typeof demoTopUpInputSchema>;
export type WithdrawalRequestInput = z.input<
	typeof withdrawalRequestInputSchema
>;
