import { createFileRoute } from "@tanstack/react-router";

import { GamesPage } from "#/components/admin/games/games-page";
import { adminGameQuerySchema } from "#/lib/schemas/admin-game.schema";

export const Route = createFileRoute("/_admin/admin/games")({
	validateSearch: (search) => {
		const parsed = adminGameQuerySchema.partial().safeParse(search);
		return parsed.success ? parsed.data : {};
	},
	head: () => ({ meta: [{ title: "Games | BearBet Admin" }] }),
	component: GamesAdminPage,
});

function GamesAdminPage() {
	const query = adminGameQuerySchema.parse(Route.useSearch());
	const navigate = Route.useNavigate();

	return (
		<GamesPage
			query={query}
			onQueryChange={(search) =>
				navigate({ search, replace: true, resetScroll: false })
			}
		/>
	);
}
