import { queryOptions } from "@tanstack/react-query";

import { getAdminOverviewFn } from "#/server/domains/admin/overview/overview.functions";

export const adminOverviewQueries = {
	all: ["admin", "overview"] as const,
	summary: () =>
		queryOptions({
			queryKey: adminOverviewQueries.all,
			queryFn: () => getAdminOverviewFn(),
			refetchInterval: 30_000,
			staleTime: 10_000,
		}),
};

export type AdminOverviewData = Awaited<ReturnType<typeof getAdminOverviewFn>>;
