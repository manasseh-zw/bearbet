import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/casino/route-placeholder";

export const Route = createFileRoute("/_casino/bonuses")({
	head: () => ({ meta: [{ title: "Bonuses | BearBet" }] }),
	component: BonusesPage,
});

function BonusesPage() {
	return (
		<RoutePlaceholder
			title="Bonuses"
			description="Available and active player bonuses will live here."
		/>
	);
}
