import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_casino/")({
	component: CasinoLobby,
});

function CasinoLobby() {
	return null;
}
