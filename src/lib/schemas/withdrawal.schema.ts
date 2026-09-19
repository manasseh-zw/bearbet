import { z } from "zod";

import { idempotencyKeySchema } from "./idempotency.schema";

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

export type WithdrawalRequestInput = z.input<
	typeof withdrawalRequestInputSchema
>;

export const withdrawalReviewInputSchema = z
	.object({
		withdrawalId: z.string().trim().min(1),
		decision: z.enum(["approve", "reject"]),
		reason: z.string().trim().min(1, "A review reason is required").max(500),
	})
	.strict();

export type WithdrawalReviewInput = z.input<typeof withdrawalReviewInputSchema>;
