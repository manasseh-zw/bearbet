import { useQuery } from "@tanstack/react-query";
import { FlameIcon } from "lucide-react";
import { useMemo } from "react";

import { GameCard } from "#/components/casino/game-card";
import { catalogueViewConfig } from "#/components/casino/lobby/catalogue-filters";
import { GameCatalogue } from "#/components/casino/lobby/game-catalogue";
import { Skeleton } from "#/components/ui/skeleton";
import { catalogueQueries } from "#/lib/queries/catalogue.queries";
import type { CatalogueRouteSearch } from "#/lib/schemas/catalogue.schema";

const catalogueSkeletonKeys = Array.from(
	{ length: 12 },
	(_, index) => `catalogue-skeleton-${index + 1}`,
);

function CatalogueSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
			{catalogueSkeletonKeys.map((key) => (
				<div key={key} className="space-y-2">
					<Skeleton className="aspect-[4/5] rounded-xl" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			))}
		</div>
	);
}

type PlayerLobbyProps = {
	query: CatalogueRouteSearch;
	onQueryChange: (query: CatalogueRouteSearch) => void;
};

export function PlayerLobby({ query, onQueryChange }: PlayerLobbyProps) {
	const fallbackCatalogue = useQuery(
		catalogueQueries.search({ q: "", scope: "casino", page: 1, pageSize: 6 }),
	);
	const featuredCatalogue = useQuery(
		catalogueQueries.search({
			q: "",
			category: catalogueViewConfig.casino.featuredCategory,
			scope: "casino",
			page: 1,
			pageSize: 6,
		}),
	);
	const topPicks = useMemo(
		() =>
			featuredCatalogue.data?.games.length
				? featuredCatalogue.data.games
				: (fallbackCatalogue.data?.games ?? []),
		[featuredCatalogue.data, fallbackCatalogue.data],
	);

	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
			<section aria-labelledby="top-picks-title">
				<div className="mb-5 flex items-center gap-3">
					<span className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary">
						<FlameIcon className="size-5" />
					</span>
					<div>
						<p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
							Featured provider
						</p>
						<h1
							id="top-picks-title"
							className="font-logo text-3xl text-foreground"
						>
							{catalogueViewConfig.casino.featuredCategory} games
						</h1>
					</div>
				</div>

				{featuredCatalogue.isPending || fallbackCatalogue.isPending ? (
					<CatalogueSkeleton />
				) : (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
						{topPicks.map((game) => (
							<GameCard
								key={game.id}
								compact
								playable
								game={{ ...game, imageUrl: game.bannerUrl ?? game.coverUrl }}
							/>
						))}
					</div>
				)}
			</section>

			<GameCatalogue
				query={query}
				onQueryChange={onQueryChange}
				scope="casino"
				priorityCategories={catalogueViewConfig.casino.priorityCategories}
				eyebrow="Find your game"
				title="Casino catalogue"
			/>
		</main>
	);
}
