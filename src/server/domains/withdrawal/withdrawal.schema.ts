import "@tanstack/react-start/server-only";

import { z } from "zod";

import {
	withdrawalRequestInputSchema,
	withdrawalReviewInputSchema,
} from "#/lib/schemas/withdrawal.schema";

const requiredIdentifierSchema = z.string().trim().min(1);

export const requestWithdrawalSchema = withdrawalRequestInputSchema.extend({
	playerId: requiredIdentifierSchema,
});

export const reviewWithdrawalSchema = withdrawalReviewInputSchema.extend({
	reviewerUserId: requiredIdentifierSchema,
	now: z.date().optional(),
});

export type RequestWithdrawalInput = z.input<typeof requestWithdrawalSchema>;
export type RequestWithdrawalCommand = z.output<typeof requestWithdrawalSchema>;
export type ReviewWithdrawalInput = z.input<typeof reviewWithdrawalSchema>;
export type ReviewWithdrawalCommand = z.output<typeof reviewWithdrawalSchema>;
