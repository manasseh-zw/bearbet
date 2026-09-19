import { queryOptions } from "@tanstack/react-query";

import type { AdminBonusQuery } from "#/lib/schemas/admin-bonus.schema";
import { listAdminBonusDefinitionsFn } from "#/server/domains/admin/bonuses/bonuses.functions";

export const adminBonusQueries = {
	all: ["admin-bonus-definitions"] as const,
	list: (query: AdminBonusQuery) =>
		queryOptions({
			queryKey: [...adminBonusQueries.all, query] as const,
			queryFn: () => listAdminBonusDefinitionsFn({ data: query }),
			staleTime: 15_000,
		}),
};
