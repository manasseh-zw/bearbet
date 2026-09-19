import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_admin/admin/bonuses")({
	head: () => ({ meta: [{ title: "Bonuses | BearBet Admin" }] }),
	component: BonusesAdminPage,
});

function BonusesAdminPage() {
	return (
		<RoutePlaceholder
			description="Create and maintain bonus definitions without changing existing player awards."
			title="Bonuses"
		/>
	);
}
