import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_admin/admin/activity")({
	head: () => ({ meta: [{ title: "Activity | BearBet Admin" }] }),
	component: ActivityAdminPage,
});

function ActivityAdminPage() {
	return (
		<RoutePlaceholder
			description="Inspect wallet, gameplay, bonus, withdrawal, and administrative operations."
			title="Activity"
		/>
	);
}
