import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getRouteSession } from "#/server/infra/auth/session.functions";

export const Route = createFileRoute("/_app/_player")({
	beforeLoad: async ({ location }) => {
		const session = await getRouteSession();

		if (!session) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		if (session.user.role !== "user" || session.user.banned) {
			throw redirect({ to: "/" });
		}

		return { session };
	},
	component: PlayerRouteLayout,
});

function PlayerRouteLayout() {
	return <Outlet />;
}
