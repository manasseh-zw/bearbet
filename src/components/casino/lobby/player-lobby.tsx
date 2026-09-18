import { useQuery } from "@tanstack/react-query";
import { FlameIcon } from "lucide-react";
import { useMemo } from "react";

import { GameCard } from "#/components/casino/game-card";
import {
	catalogueViewConfig,
	normalizeCatalogueCategory,
} from "#/components/casino/lobby/catalogue-filters";
import { GameCatalogue } from "#/components/casino/lobby/game-catalogue";
import { Skeleton } from "#/components/ui/skeleton";
import { catalogueQueries } from "#/lib/queries/catalogue.queries";

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

export function PlayerLobby() {
	const catalogue = useQuery(catalogueQueries.games());
	const games = useMemo(
		() => catalogue.data?.filter((game) => game.isAvailable) ?? [],
		[catalogue.data],
	);
	const topPicks = useMemo(() => {
		const featured = games.filter(
			(game) =>
				normalizeCatalogueCategory(game.category) ===
				catalogueViewConfig.casino.featuredCategory,
		);

		return (featured.length > 0 ? featured : games).slice(0, 6);
	}, [games]);

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

				{catalogue.isPending ? (
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
				games={games}
				isPending={catalogue.isPending}
				isError={catalogue.isError}
				onRetry={() => catalogue.refetch()}
				defaultCategory={catalogueViewConfig.casino.defaultCategory}
				priorityCategories={catalogueViewConfig.casino.priorityCategories}
				eyebrow="Find your game"
				title="Casino catalogue"
			/>
		</main>
	);
}
