import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getInternalRedirect, getPostLoginRedirect } from "#/lib/navigation";
import { getRouteSession } from "#/server/infra/auth/session.functions";

export const Route = createFileRoute("/_guest")({
	beforeLoad: async ({ location }) => {
		const session = await getRouteSession();

		if (session) {
			const redirectTo = getInternalRedirect(
				new URLSearchParams(location.searchStr).get("redirect"),
			);
			throw redirect({
				href: getPostLoginRedirect({
					redirectTo,
					role: session.user.role,
				}),
			});
		}
	},
	component: GuestLayout,
});

function GuestLayout() {
	return (
		<main className="min-h-svh bg-background">
			<Outlet />
		</main>
	);
}
