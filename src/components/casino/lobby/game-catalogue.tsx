import { SearchIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import {
	type FilterDefinition,
	FilterGrid,
} from "#/components/casino/catalogue-filter-grid";
import { GameCard } from "#/components/casino/game-card";
import {
	getCatalogueCategories,
	normalizeCatalogueCategory,
} from "#/components/casino/lobby/catalogue-filters";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import type { NormalizedGame } from "#/server/infra/providers/provider.types";

type GameCatalogueProps = {
	games: readonly NormalizedGame[];
	isPending: boolean;
	isError: boolean;
	onRetry: () => void;
	defaultCategory?: string;
	priorityCategories?: readonly string[];
	includedCategories?: readonly string[];
	title: string;
	eyebrow?: string;
	topMargin?: "mt-0" | "mt-12";
};

function useCatalogueColumns() {
	const [columns, setColumns] = useState(2);

	useEffect(() => {
		const update = () => {
			if (window.innerWidth >= 1536) setColumns(6);
			else if (window.innerWidth >= 1280) setColumns(5);
			else if (window.innerWidth >= 1024) setColumns(4);
			else if (window.innerWidth >= 640) setColumns(3);
			else setColumns(2);
		};

		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	return columns;
}

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

export function GameCatalogue({
	games,
	isPending,
	isError,
	onRetry,
	defaultCategory,
	priorityCategories,
	includedCategories,
	title,
	eyebrow = "Browse the catalogue",
	topMargin = "mt-12",
}: GameCatalogueProps) {
	const [search, setSearch] = useState("");
	const columns = useCatalogueColumns();
	const searchId = useId();
	const scopedGames = useMemo(() => {
		if (!includedCategories) return games;

		const included = new Set(includedCategories);
		return games.filter((game) =>
			included.has(normalizeCatalogueCategory(game.category)),
		);
	}, [games, includedCategories]);
	const categories = useMemo<FilterDefinition<NormalizedGame>[]>(
		() => [
			{
				id: "all",
				label: "All categories",
				match: () => true,
			},
			...getCatalogueCategories(scopedGames, { priorityCategories }).map(
				(category) => ({
					id: category.id,
					label: category.label,
					match: (game: NormalizedGame) =>
						normalizeCatalogueCategory(game.category) === category.value,
				}),
			),
		],
		[priorityCategories, scopedGames],
	);
	const searchedGames = useMemo(() => {
		const query = search.trim().toLocaleLowerCase();
		if (!query) return scopedGames;

		return scopedGames.filter((game) =>
			`${game.name} ${game.provider} ${game.category ?? ""}`
				.toLocaleLowerCase()
				.includes(query),
		);
	}, [scopedGames, search]);

	return (
		<section
			className={`${topMargin} pb-12`}
			aria-labelledby={`${searchId}-title`}
		>
			<div className="mb-5">
				<p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
					{eyebrow}
				</p>
				<h2
					id={`${searchId}-title`}
					className="mt-1 font-logo text-3xl text-foreground sm:text-4xl"
				>
					{title}
				</h2>
			</div>

			<label htmlFor={`${searchId}-input`} className="relative mb-5 block">
				<span className="sr-only">Search games</span>
				<SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input
					id={`${searchId}-input`}
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search games..."
					className="h-12 rounded-xl border-white/8 bg-card pr-4 pl-12 text-sm shadow-none placeholder:text-muted-foreground/65"
				/>
			</label>

			{isPending ? (
				<CatalogueSkeleton />
			) : isError ? (
				<div className="grid min-h-64 place-items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 text-center">
					<div>
						<p className="font-semibold text-foreground">
							The catalogue could not be loaded.
						</p>
						<button
							type="button"
							onClick={onRetry}
							className="mt-2 text-sm font-semibold text-primary hover:underline"
						>
							Try again
						</button>
					</div>
				</div>
			) : (
				<FilterGrid
					items={searchedGames}
					filters={categories}
					defaultValue={
						defaultCategory ? `category:${defaultCategory}` : undefined
					}
					label="Game category"
					getKey={(game) => game.id}
					columns={columns}
					gap={columns === 2 ? 20 : 24}
					emptyLabel={
						search
							? `No games found for “${search}”`
							: "No games in this category"
					}
					renderItem={(game) => (
						<GameCard
							playable
							game={{ ...game, imageUrl: game.bannerUrl ?? game.coverUrl }}
						/>
					)}
				/>
			)}
		</section>
	);
}
