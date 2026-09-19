import { createFileRoute } from "@tanstack/react-router";

import { GuestLobby } from "#/components/casino/lobby/guest-lobby";
import { PlayerLobby } from "#/components/casino/lobby/player-lobby";
import { Skeleton } from "#/components/ui/skeleton";
import { authClient } from "#/lib/auth-client";
import {
	catalogueRouteSearchSchema,
	normalizeCatalogueRouteSearch,
} from "#/lib/schemas/catalogue.schema";

export const Route = createFileRoute("/_app/")({
	validateSearch: (search) => {
		const parsed = catalogueRouteSearchSchema.safeParse(search);
		return parsed.success ? parsed.data : {};
	},
	component: CasinoLobby,
});

const lobbySkeletonKeys = Array.from(
	{ length: 6 },
	(_, index) => `lobby-skeleton-${index + 1}`,
);

function CasinoLobby() {
	const query = normalizeCatalogueRouteSearch(Route.useSearch());
	const navigate = Route.useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
				<Skeleton className="h-10 w-64" />
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					{lobbySkeletonKeys.map((key) => (
						<Skeleton key={key} className="aspect-[5/6] rounded-xl" />
					))}
				</div>
			</main>
		);
	}

	return session?.user ? (
		<PlayerLobby
			query={query}
			onQueryChange={(search) =>
				navigate({ search, replace: true, resetScroll: false })
			}
		/>
	) : (
		<GuestLobby />
	);
}
