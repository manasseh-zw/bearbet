import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { gameQueries } from "#/components/casino/game.queries";
import { RoutePlaceholder } from "#/components/casino/route-placeholder";

export const Route = createFileRoute("/_casino/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(gameQueries.catalogue()),
	pendingMs: 0,
	pendingMinMs: 300,
	pendingComponent: CasinoPending,
	errorComponent: CasinoError,
	component: CasinoLobby,
});

function CasinoLobby() {
	const { data: games } = useSuspenseQuery(gameQueries.catalogue());

	return (
		<RoutePlaceholder
			title="Casino"
			description={`${games.length} games are ready for the lobby interface.`}
		/>
	);
}

function CasinoPending() {
	return (
		<RoutePlaceholder
			title="Casino"
			description="Loading the game catalogue..."
		/>
	);
}

function CasinoError({ error }: { error: unknown }) {
	return (
		<RoutePlaceholder
			title="Casino unavailable"
			description={
				error instanceof Error
					? error.message
					: "The game catalogue could not be loaded."
			}
		/>
	);
}
