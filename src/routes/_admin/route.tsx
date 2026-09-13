import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getRouteSession } from "#/server/infra/auth/session.functions";

export const Route = createFileRoute("/_admin")({
	beforeLoad: async ({ location }) => {
		const session = await getRouteSession();

		if (!session) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		if (session.user.role !== "admin" || session.user.banned) {
			throw redirect({ to: "/" });
		}

		return { session };
	},
	component: AdminAccessLayout,
});

function AdminAccessLayout() {
	return <Outlet />;
}
