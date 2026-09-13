import { z } from "zod";

export const historyCategories = [
	"all",
	"wallet",
	"bet",
	"win",
	"refund",
] as const;

export const historyBuckets = ["cash", "bonus", "reserved_cash"] as const;

export const historyOperationTypes = [
	"welcome_credit",
	"demo_top_up",
	"bet",
	"win",
	"refund",
	"withdrawal_reserve",
	"withdrawal_release",
	"withdrawal_debit",
	"bonus_credit",
	"bonus_conversion",
	"bonus_forfeit",
	"admin_adjustment",
] as const;

const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
		message: "Enter a valid date",
	});

export const historyQuerySchema = z
	.object({
		category: z.enum(historyCategories).default("all"),
		page: z.coerce.number().int().positive().max(10_000).default(1),
		bucket: z.enum(historyBuckets).optional(),
		type: z.enum(historyOperationTypes).optional(),
		from: dateSchema.optional(),
		to: dateSchema.optional(),
	})
	.refine((input) => !input.from || !input.to || input.from <= input.to, {
		message: "The start date must be before the end date",
		path: ["from"],
	});

export type HistoryQuery = z.output<typeof historyQuerySchema>;
export type HistoryCategory = HistoryQuery["category"];
export type HistoryBucket = NonNullable<HistoryQuery["bucket"]>;
export type HistoryOperationType = NonNullable<HistoryQuery["type"]>;
