import { queryOptions } from "@tanstack/react-query";

import type { AdminGameQuery } from "#/lib/schemas/admin-game.schema";
import { listAdminGamesFn } from "#/server/domains/admin/games/games.functions";

export const adminGameQueries = {
	all: ["admin-games"] as const,
	list: (query: AdminGameQuery) =>
		queryOptions({
			queryKey: [...adminGameQueries.all, query] as const,
			queryFn: () => listAdminGamesFn({ data: query }),
			staleTime: 15_000,
		}),
};
