import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type {
	AdminActivityQuery,
	AdminWithdrawalQuery,
} from "#/lib/schemas/admin-operations.schema";
import {
	listAdminActivityFn,
	listAdminWithdrawalsFn,
} from "#/server/domains/admin/operations/operations.functions";

export const adminOperationsQueries = {
	all: ["admin", "operations"] as const,
	withdrawals: (query: AdminWithdrawalQuery) =>
		queryOptions({
			queryKey: [...adminOperationsQueries.all, "withdrawals", query] as const,
			queryFn: () => listAdminWithdrawalsFn({ data: query }),
			placeholderData: keepPreviousData,
			staleTime: 5_000,
		}),
	activity: (query: AdminActivityQuery) =>
		queryOptions({
			queryKey: [...adminOperationsQueries.all, "activity", query] as const,
			queryFn: () => listAdminActivityFn({ data: query }),
			staleTime: 5_000,
		}),
};

export type AdminWithdrawalRow = Awaited<
	ReturnType<typeof listAdminWithdrawalsFn>
>["items"][number];
export type AdminActivityPage = Awaited<ReturnType<typeof listAdminActivityFn>>;
