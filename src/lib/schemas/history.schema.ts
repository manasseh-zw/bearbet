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
	"provider_reconciliation",
] as const;

export const historyTimeRanges = ["all", "today"] as const;
export const historyDirections = ["desc", "asc"] as const;

export const historyQuerySchema = z.object({
	category: z.enum(historyCategories).default("all"),
	page: z.coerce.number().int().positive().max(10_000).default(1),
	bucket: z.enum(historyBuckets).optional(),
	type: z.enum(historyOperationTypes).optional(),
	types: z
		.array(z.enum(historyOperationTypes))
		.max(historyOperationTypes.length)
		.default([]),
	timeRange: z.enum(historyTimeRanges).default("all"),
	direction: z.enum(historyDirections).default("desc"),
});

export type HistoryQueryInput = z.input<typeof historyQuerySchema>;
export type HistoryQuery = z.output<typeof historyQuerySchema>;
export type HistoryCategory = HistoryQuery["category"];
export type HistoryBucket = NonNullable<HistoryQuery["bucket"]>;
export type HistoryOperationType = (typeof historyOperationTypes)[number];
export type HistoryTimeRange = HistoryQuery["timeRange"];
export type HistoryDirection = HistoryQuery["direction"];
