import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_admin/admin")({
	head: () => ({ meta: [{ title: "Admin | BearBet" }] }),
	component: AdminPage,
});

function AdminPage() {
	return <RoutePlaceholder title="Admin" />;
}
