import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppLayout } from "#/components/layout/app-layout";

export const Route = createFileRoute("/_app")({
	component: AppRouteLayout,
});

function AppRouteLayout() {
	return (
		<AppLayout>
			<Outlet />
		</AppLayout>
	);
}
