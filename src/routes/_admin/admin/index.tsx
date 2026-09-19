import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "#/components/admin/admin-overview";

export const Route = createFileRoute("/_admin/admin/")({
	head: () => ({ meta: [{ title: "Overview | BearBet Admin" }] }),
	component: AdminOverview,
});
