import { queryOptions } from "@tanstack/react-query";

import { getCurrentPlayerGameEngagement } from "#/server/domains/game-engagement/game-engagement.functions";

export const gameEngagementQueries = {
	all: ["game-engagement"] as const,
	current: () =>
		queryOptions({
			queryKey: [...gameEngagementQueries.all, "current"] as const,
			queryFn: () => getCurrentPlayerGameEngagement(),
			staleTime: 30_000,
		}),
};
