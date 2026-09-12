import "@tanstack/react-start/server-only";

import { z } from "zod";

import { ledgerEntryType, walletBucket } from "#/server/infra/db/wallet.schema";

export const DEMO_TOP_UP_AMOUNTS_MINOR = [
	10_000, 50_000, 100_000, 1_000_000,
] as const;

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

export const demoTopUpSchema = z.object({
	playerId: requiredIdentifierSchema,
	amountMinor: z
		.number()
		.refine(
			(value) =>
				DEMO_TOP_UP_AMOUNTS_MINOR.includes(
					value as (typeof DEMO_TOP_UP_AMOUNTS_MINOR)[number],
				),
			{ message: "Choose a supported demo top-up amount" },
		),
	idempotencyKey: requiredIdentifierSchema,
});

export type WalletMovement = z.output<typeof walletMovementSchema>;
export type ApplyWalletOperationInput = z.input<
	typeof applyWalletOperationSchema
>;
export type ApplyWalletOperationCommand = z.output<
	typeof applyWalletOperationSchema
>;
export type DemoTopUpInput = z.input<typeof demoTopUpSchema>;
