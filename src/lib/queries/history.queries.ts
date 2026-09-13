import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { HistoryQuery } from "#/lib/schemas/history.schema";
import { getCurrentPlayerHistory } from "#/server/domains/history/history.functions";

export const historyQueries = {
	all: ["history"] as const,
	list: (query: HistoryQuery) =>
		queryOptions({
			queryKey: [...historyQueries.all, query] as const,
			queryFn: () => getCurrentPlayerHistory({ data: query }),
			placeholderData: keepPreviousData,
			staleTime: 15_000,
		}),
};
