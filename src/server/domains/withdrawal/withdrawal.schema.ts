import "@tanstack/react-start/server-only";

import { z } from "zod";

const requiredIdentifierSchema = z.string().trim().min(1);

const positiveSafeIntegerSchema = z
	.number()
	.refine((value) => Number.isSafeInteger(value) && value > 0, {
		message: "Amount must be a positive safe integer",
	});

export const requestWithdrawalSchema = z.object({
	playerId: requiredIdentifierSchema,
	amountMinor: positiveSafeIntegerSchema,
	idempotencyKey: requiredIdentifierSchema,
});

export const reviewWithdrawalSchema = z.object({
	withdrawalId: requiredIdentifierSchema,
	reviewerUserId: requiredIdentifierSchema,
	decision: z.enum(["approve", "reject"]),
	reason: z.string().trim().min(1, "A review reason is required"),
	now: z.date().optional(),
});

export type RequestWithdrawalInput = z.input<typeof requestWithdrawalSchema>;
export type RequestWithdrawalCommand = z.output<typeof requestWithdrawalSchema>;
export type ReviewWithdrawalInput = z.input<typeof reviewWithdrawalSchema>;
export type ReviewWithdrawalCommand = z.output<typeof reviewWithdrawalSchema>;
