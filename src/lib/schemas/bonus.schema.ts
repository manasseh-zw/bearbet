import { z } from "zod";

import { idempotencyKeySchema } from "./idempotency.schema";

export const bonusDefinitionTypes = [
	"welcome",
	"deposit",
	"promotional",
] as const;

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, {
	message: "Value must be a safe integer",
});

const positiveSafeIntegerSchema = safeIntegerSchema.refine(
	(value) => value > 0,
	{ message: "Value must be greater than zero" },
);

const optionalRuleListSchema = z
	.array(z.string())
	.optional()
	.transform((values) => [
		...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
	]);

export const bonusDefinitionFieldsSchema = z.object({
	name: z.string().trim().min(1).max(120),
	description: z
		.string()
		.optional()
		.transform((value) => value?.trim() || undefined),
	type: z.enum(bonusDefinitionTypes),
	amountMinor: positiveSafeIntegerSchema,
	matchPercentageBps: z.number().int().positive().max(10_000).optional(),
	wageringMultiplier: positiveSafeIntegerSchema,
	expiresAfterDays: positiveSafeIntegerSchema,
	minimumDepositMinor: safeIntegerSchema
		.refine((value) => value >= 0, {
			message: "Value must be non-negative",
		})
		.optional(),
	maximumAwardMinor: positiveSafeIntegerSchema.optional(),
	eligibleGameIds: optionalRuleListSchema,
	eligibleCategories: optionalRuleListSchema,
	eligibleProviders: optionalRuleListSchema,
});

function validateBonusDefinitionFields(
	input: z.infer<typeof bonusDefinitionFieldsSchema>,
	context: z.RefinementCtx,
) {
	if (input.matchPercentageBps && input.type !== "deposit") {
		context.addIssue({
			code: "custom",
			path: ["matchPercentageBps"],
			message: "Only deposit bonuses can use a match percentage",
		});
	}
	const requiredWager =
		BigInt(input.amountMinor) * BigInt(input.wageringMultiplier);
	if (requiredWager > BigInt(Number.MAX_SAFE_INTEGER)) {
		context.addIssue({
			code: "custom",
			path: ["wageringMultiplier"],
			message: "Required wager exceeds the safe integer limit",
		});
	}
}

export const createBonusDefinitionSchema = bonusDefinitionFieldsSchema
	.extend({
		code: z
			.string()
			.trim()
			.transform((value) => value.toUpperCase())
			.pipe(z.string().regex(/^[A-Z0-9_-]{3,64}$/)),
	})
	.superRefine(validateBonusDefinitionFields);

export const updateBonusDefinitionSchema = bonusDefinitionFieldsSchema
	.extend({ definitionId: z.string().uuid() })
	.superRefine(validateBonusDefinitionFields);

export type CreateBonusDefinitionInput = z.input<
	typeof createBonusDefinitionSchema
>;

export type CreateBonusDefinitionCommand = z.output<
	typeof createBonusDefinitionSchema
>;

export type UpdateBonusDefinitionInput = z.input<
	typeof updateBonusDefinitionSchema
>;

export const activateBonusInputSchema = z
	.object({
		definitionId: z.string().uuid(),
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

export type ActivateBonusInput = z.input<typeof activateBonusInputSchema>;
