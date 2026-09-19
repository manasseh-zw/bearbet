import { z } from "zod";

import { idempotencyKeySchema } from "./idempotency.schema";

const userIdSchema = z.string().trim().min(1);
const reasonSchema = z.string().trim().min(1, "A reason is required").max(500);
const nonZeroSafeIntegerSchema = z
	.number()
	.refine((value) => Number.isSafeInteger(value) && value !== 0, {
		message: "Adjustment must be a non-zero safe integer",
	});

export const suspendUserInputSchema = z
	.object({ userId: userIdSchema, reason: reasonSchema })
	.strict();

export const activateUserInputSchema = z
	.object({ userId: userIdSchema, reason: reasonSchema })
	.strict();

export const adjustUserBalanceInputSchema = z
	.object({
		userId: userIdSchema,
		amountMinor: nonZeroSafeIntegerSchema,
		reason: reasonSchema,
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

export const assignUserBonusInputSchema = z
	.object({
		userId: userIdSchema,
		definitionId: userIdSchema,
		reason: reasonSchema,
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

export type SuspendUserInput = z.input<typeof suspendUserInputSchema>;
export type ActivateUserInput = z.input<typeof activateUserInputSchema>;
export type AdjustUserBalanceInput = z.input<
	typeof adjustUserBalanceInputSchema
>;
export type AssignUserBonusInput = z.input<typeof assignUserBonusInputSchema>;
