import "@tanstack/react-start/server-only";

import { z } from "zod";

import { demoTopUpInputSchema } from "#/lib/schemas/wallet.schema";
import { ledgerEntryType, walletBucket } from "#/server/infra/db/wallet.schema";

export { DEMO_TOP_UP_AMOUNTS_MINOR } from "#/lib/schemas/wallet.schema";

const requiredIdentifierSchema = z.string().trim().min(1);

const nonZeroSafeIntegerSchema = z
	.number()
	.refine((value) => Number.isSafeInteger(value) && value !== 0, {
		message: "Movement must be a non-zero safe integer",
	});

export const walletMovementSchema = z.object({
	bucket: z.enum(walletBucket.enumValues),
	amountMinor: nonZeroSafeIntegerSchema,
});

export const applyWalletOperationSchema = z.object({
	playerId: requiredIdentifierSchema,
	type: z.enum(ledgerEntryType.enumValues),
	idempotencyKey: requiredIdentifierSchema,
	movements: z.array(walletMovementSchema).min(1),
	sourceType: z.string().optional(),
	sourceId: z.string().optional(),
	actorUserId: z.string().optional(),
});

export const demoTopUpSchema = demoTopUpInputSchema.extend({
	playerId: requiredIdentifierSchema,
});

export type WalletMovement = z.output<typeof walletMovementSchema>;
export type ApplyWalletOperationInput = z.input<
	typeof applyWalletOperationSchema
>;
export type ApplyWalletOperationCommand = z.output<
	typeof applyWalletOperationSchema
>;
export type DemoTopUpInput = z.input<typeof demoTopUpSchema>;
