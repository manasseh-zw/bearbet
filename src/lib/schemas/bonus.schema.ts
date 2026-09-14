import { z } from "zod";

import { idempotencyKeySchema } from "./idempotency.schema";

export const activateBonusInputSchema = z
	.object({
		definitionId: z.string().uuid(),
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

export type ActivateBonusInput = z.input<typeof activateBonusInputSchema>;
