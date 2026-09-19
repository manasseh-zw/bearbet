import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { CatalogueSearch } from "#/lib/schemas/catalogue.schema";
import {
	getGames,
	searchCatalogue,
} from "#/server/domains/game/game.functions";

export const catalogueQueries = {
	all: ["catalogue"] as const,
	games: () =>
		queryOptions({
			queryKey: [...catalogueQueries.all, "games"] as const,
			queryFn: () => getGames(),
			staleTime: 5 * 60 * 1_000,
		}),
	search: (query: CatalogueSearch) =>
		queryOptions({
			queryKey: [...catalogueQueries.all, "search", query] as const,
			queryFn: () => searchCatalogue({ data: query }),
			placeholderData: keepPreviousData,
			staleTime: 30_000,
			gcTime: 10 * 60 * 1_000,
		}),
};
