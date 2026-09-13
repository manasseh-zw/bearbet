import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_app/_player/games/$gameId")({
	head: () => ({ meta: [{ title: "Game | BearBet" }] }),
	component: GamePage,
});

function GamePage() {
	return <RoutePlaceholder title="Game" />;
}
