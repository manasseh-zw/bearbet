import { queryOptions } from "@tanstack/react-query";

import { getCurrentPlayerBonuses } from "#/server/domains/bonus/bonus.functions";

export const bonusQueries = {
	all: ["bonuses"] as const,
	current: () =>
		queryOptions({
			queryKey: [...bonusQueries.all, "current"] as const,
			queryFn: () => getCurrentPlayerBonuses(),
			staleTime: 15_000,
		}),
};
