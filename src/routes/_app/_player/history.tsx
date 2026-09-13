import { createFileRoute } from "@tanstack/react-router";

import { HistoryPage } from "#/components/player/history/history-page";
import { historyQuerySchema } from "#/lib/schemas/history.schema";

export const Route = createFileRoute("/_app/_player/history")({
	validateSearch: (search) => {
		const parsed = historyQuerySchema.safeParse(search);
		return parsed.success
			? parsed.data
			: historyQuerySchema.parse({ category: "all", page: 1 });
	},
	head: () => ({ meta: [{ title: "History | BearBet" }] }),
	component: HistoryRoute,
});

function HistoryRoute() {
	const query = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<HistoryPage
			query={query}
			onQueryChange={(search) => navigate({ search, replace: true })}
		/>
	);
}
