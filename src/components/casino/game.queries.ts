import { queryOptions } from "@tanstack/react-query";

import { getGames } from "#/server/domains/game/game.functions";

export const gameQueries = {
	all: ["games"] as const,
	catalogue: () =>
		queryOptions({
			queryKey: [...gameQueries.all, "catalogue"] as const,
			queryFn: () => getGames(),
			staleTime: 5 * 60 * 1_000,
		}),
};
