import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_app/_player/bonuses")({
	head: () => ({ meta: [{ title: "Bonuses | BearBet" }] }),
	component: BonusesPage,
});

function BonusesPage() {
	return <RoutePlaceholder title="Bonuses" />;
}
