import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_app/_player/history")({
	head: () => ({ meta: [{ title: "History | BearBet" }] }),
	component: HistoryPage,
});

function HistoryPage() {
	return <RoutePlaceholder title="History" />;
}
