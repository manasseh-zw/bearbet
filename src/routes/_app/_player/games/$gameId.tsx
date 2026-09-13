import { createFileRoute } from "@tanstack/react-router";

import { DemoGamePage } from "#/components/player/game/demo-game-page";

export const Route = createFileRoute("/_app/_player/games/$gameId")({
	head: () => ({ meta: [{ title: "Game | BearBet" }] }),
	component: GamePage,
});

function GamePage() {
	const { gameId } = Route.useParams();
	return <DemoGamePage gameId={gameId} />;
}
