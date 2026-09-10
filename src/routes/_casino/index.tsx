import { createFileRoute } from "@tanstack/react-router";

import { GuestLobby } from "#/components/casino/guest-lobby";

export const Route = createFileRoute("/_casino/")({
	component: GuestLobby,
});
