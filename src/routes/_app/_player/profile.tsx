import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_app/_player/profile")({
	head: () => ({ meta: [{ title: "Profile | BearBet" }] }),
	component: ProfilePage,
});

function ProfilePage() {
	return <RoutePlaceholder title="Profile" />;
}
