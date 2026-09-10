import { queryOptions } from "@tanstack/react-query";

import { getGames } from "#/server/domains/game/game.functions";

export const catalogueQueries = {
	all: ["catalogue"] as const,
	games: () =>
		queryOptions({
			queryKey: [...catalogueQueries.all, "games"] as const,
			queryFn: () => getGames(),
			staleTime: 5 * 60 * 1_000,
		}),
};
