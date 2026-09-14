import "@tanstack/react-start/server-only";

import { z } from "zod";

import { bonusDefinitionType } from "#/server/infra/db/schema";

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

export const createBonusDefinitionSchema = z
	.object({
		code: z
			.string()
			.trim()
			.transform((value) => value.toUpperCase())
			.pipe(z.string().regex(/^[A-Z0-9_-]{3,64}$/)),
		name: z.string().trim().min(1).max(120),
		description: z
			.string()
			.optional()
			.transform((value) => value?.trim() || undefined),
		type: z.enum(bonusDefinitionType.enumValues),
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
	})
	.superRefine((input, context) => {
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
	});

export type CreateBonusDefinitionInput = z.input<
	typeof createBonusDefinitionSchema
>;

export type CreateBonusDefinitionCommand = z.output<
	typeof createBonusDefinitionSchema
>;
