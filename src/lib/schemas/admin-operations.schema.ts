import { z } from "zod";

import {
	adminCursorSchema,
	adminPageSchema,
	adminPageSizeSchema,
} from "./admin-query.schema";
import { historyOperationTypes } from "./history.schema";

export const adminWithdrawalStatuses = [
	"all",
	"pending",
	"approved",
	"rejected",
] as const;

export const adminWithdrawalDirections = ["desc", "asc"] as const;

export const adminWithdrawalQuerySchema = z
	.object({
		page: adminPageSchema.default(1),
		pageSize: adminPageSizeSchema.default(20),
		search: z.string().trim().max(100).default(""),
		status: z.enum(adminWithdrawalStatuses).default("pending"),
		direction: z.enum(adminWithdrawalDirections).default("desc"),
	})
	.strict();

export const adminActivityTabs = [
	"wallet",
	"gameplay",
	"withdrawals",
	"audit",
] as const;

export const adminActivityQuerySchema = z
	.object({
		tab: z.enum(adminActivityTabs).default("wallet"),
		search: z.string().trim().max(100).default(""),
		type: z.enum(historyOperationTypes).optional(),
		types: z
			.array(z.enum(historyOperationTypes))
			.max(historyOperationTypes.length)
			.default([]),
		withdrawalStatus: z.enum(adminWithdrawalStatuses).default("all"),
		withdrawalStatuses: z
			.array(z.enum(adminWithdrawalStatuses))
			.max(adminWithdrawalStatuses.length)
			.default([]),
		limit: adminPageSizeSchema.default(25),
		cursor: adminCursorSchema.optional(),
	})
	.strict();

export type AdminWithdrawalQuery = z.output<typeof adminWithdrawalQuerySchema>;
export type AdminWithdrawalStatus = AdminWithdrawalQuery["status"];
export type AdminActivityQueryInput = z.input<typeof adminActivityQuerySchema>;
export type AdminActivityQuery = z.output<typeof adminActivityQuerySchema>;
export type AdminActivityTab = AdminActivityQuery["tab"];
