"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3Icon, FlameIcon, HeartIcon } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { GameCard } from "#/components/casino/game-card";
import { catalogueViewConfig } from "#/components/casino/lobby/catalogue-filters";
import { GameCatalogue } from "#/components/casino/lobby/game-catalogue";
import { Skeleton } from "#/components/ui/skeleton";
import { catalogueQueries } from "#/lib/queries/catalogue.queries";
import { gameEngagementQueries } from "#/lib/queries/game-engagement.queries";
import type { CatalogueRouteSearch } from "#/lib/schemas/catalogue.schema";
import { setCurrentPlayerGameFavorite } from "#/server/domains/game-engagement/game-engagement.functions";

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
	const queryClient = useQueryClient();
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
	const engagement = useQuery(gameEngagementQueries.current());
	const favoriteMutation = useMutation({
		mutationFn: (input: { gameId: string; isFavorite: boolean }) =>
			setCurrentPlayerGameFavorite({ data: input }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: gameEngagementQueries.all,
			});
		},
	});

	const favorites = engagement.data?.favorites ?? [];
	const recent = engagement.data?.recent ?? [];
	const favoriteGameIds = useMemo(
		() => new Set(engagement.data?.favoriteGameIds ?? []),
		[engagement.data?.favoriteGameIds],
	);
	const topPicks = useMemo(
		() =>
			featuredCatalogue.data?.games.length
				? featuredCatalogue.data.games
				: (fallbackCatalogue.data?.games ?? []),
		[featuredCatalogue.data, fallbackCatalogue.data],
	);
	const hasActivity = favorites.length > 0 || recent.length > 0;
	const selectedCollectionGames =
		query.collection === "favorites"
			? favorites
			: query.collection === "recent"
				? recent
				: [];
	const specialCollections = [
		{
			value: "favorites" as const,
			label: "Favorites",
			count: favorites.length,
		},
		{
			value: "recent" as const,
			label: "Recently played",
			count: recent.length,
		},
	].filter((item) => item.count > 0 || query.collection === item.value);

	function toggleFavorite(gameId: string, isFavorite: boolean) {
		favoriteMutation.mutate({ gameId, isFavorite });
	}

	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
			{favoriteMutation.isError ? (
				<p
					role="alert"
					className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{favoriteMutation.error instanceof Error
						? favoriteMutation.error.message
						: "Your favorite could not be updated. Try again."}
				</p>
			) : null}

			{!query.collection ? (
				<>
					{favorites.length > 0 ? (
						<GameCollectionSection
							games={favorites}
							favoriteGameIds={favoriteGameIds}
							icon={<HeartIcon className="size-5" />}
							onToggleFavorite={toggleFavorite}
							pending={favoriteMutation.isPending}
							title="Your favorites"
						/>
					) : null}
					{recent.length > 0 ? (
						<GameCollectionSection
							games={recent}
							favoriteGameIds={favoriteGameIds}
							icon={<Clock3Icon className="size-5" />}
							onToggleFavorite={toggleFavorite}
							pending={favoriteMutation.isPending}
							title="Recently played"
						/>
					) : null}
					{!hasActivity ? (
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
											game={{
												...game,
												imageUrl: game.bannerUrl ?? game.coverUrl,
												isFavorite: favoriteGameIds.has(game.id),
											}}
											onToggleFavorite={() =>
												toggleFavorite(game.id, !favoriteGameIds.has(game.id))
											}
											favoritePending={favoriteMutation.isPending}
										/>
									))}
								</div>
							)}
						</section>
					) : null}
				</>
			) : null}

			<GameCatalogue
				query={query}
				onQueryChange={onQueryChange}
				scope="casino"
				priorityCategories={catalogueViewConfig.casino.priorityCategories}
				specialCollections={specialCollections}
				collectionGames={selectedCollectionGames}
				collectionPending={engagement.isPending}
				collectionError={engagement.isError}
				favoriteGameIds={favoriteGameIds}
				onToggleFavorite={toggleFavorite}
				favoritePending={favoriteMutation.isPending}
				eyebrow="Find your game"
				title="Casino catalogue"
				topMargin={query.collection ? "mt-0" : "mt-12"}
			/>
		</main>
	);
}

function GameCollectionSection({
	games,
	favoriteGameIds,
	icon,
	onToggleFavorite,
	pending,
	title,
}: {
	games: Array<{
		id: string;
		name: string;
		provider: string;
		category?: string;
		type?: string;
		bannerUrl?: string;
		coverUrl?: string;
	}>;
	favoriteGameIds: ReadonlySet<string>;
	icon: ReactNode;
	onToggleFavorite: (gameId: string, isFavorite: boolean) => void;
	pending: boolean;
	title: string;
}) {
	return (
		<section className="mb-10" aria-labelledby={`${title}-title`}>
			<div className="mb-5 flex items-center gap-3">
				<span className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary">
					{icon}
				</span>
				<h1
					id={`${title}-title`}
					className="font-logo text-3xl text-foreground"
				>
					{title}
				</h1>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{games.map((game) => (
					<GameCard
						key={game.id}
						compact
						playable
						game={{
							...game,
							imageUrl: game.bannerUrl ?? game.coverUrl,
							isFavorite: favoriteGameIds.has(game.id),
						}}
						onToggleFavorite={() =>
							onToggleFavorite(game.id, !favoriteGameIds.has(game.id))
						}
						favoritePending={pending}
					/>
				))}
			</div>
		</section>
	);
}
