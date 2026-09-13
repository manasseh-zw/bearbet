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
