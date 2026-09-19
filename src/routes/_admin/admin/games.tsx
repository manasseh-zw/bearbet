import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_admin/admin/games")({
	head: () => ({ meta: [{ title: "Games | BearBet Admin" }] }),
	component: GamesAdminPage,
});

function GamesAdminPage() {
	return (
		<RoutePlaceholder
			description="Synchronize the provider catalogue and manage local game availability and curation."
			title="Games"
		/>
	);
}
