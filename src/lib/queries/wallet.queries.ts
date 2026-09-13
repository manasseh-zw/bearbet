import { queryOptions } from "@tanstack/react-query";

import { getCurrentWallet } from "#/server/domains/wallet/wallet.functions";

export const walletQueries = {
	all: ["wallet"] as const,
	current: () =>
		queryOptions({
			queryKey: [...walletQueries.all, "current"] as const,
			queryFn: () => getCurrentWallet(),
			staleTime: 15_000,
		}),
};
