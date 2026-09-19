import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "#/components/admin/admin-shell";

export const Route = createFileRoute("/_admin/admin")({
	component: AdminPortalLayout,
});

function AdminPortalLayout() {
	return (
		<AdminShell>
			<Outlet />
		</AdminShell>
	);
}
