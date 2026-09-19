import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { AdminUserQuery } from "#/lib/schemas/admin-query.schema";
import {
	listAdminBonusDefinitionsFn,
	listAdminUsersFn,
} from "#/server/domains/admin/users/users.functions";

export const adminUserQueries = {
	all: ["admin", "users"] as const,
	list: (query: AdminUserQuery) =>
		queryOptions({
			queryKey: [...adminUserQueries.all, query] as const,
			queryFn: () => listAdminUsersFn({ data: query }),
			placeholderData: keepPreviousData,
			staleTime: 10_000,
		}),
	activeBonusDefinitions: () =>
		queryOptions({
			queryKey: [...adminUserQueries.all, "bonus-definitions"] as const,
			queryFn: () => listAdminBonusDefinitionsFn(),
			staleTime: 60_000,
		}),
};
