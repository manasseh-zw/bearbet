import { useQuery } from "@tanstack/react-query";
import {
	CircleDotIcon,
	DicesIcon,
	FlameIcon,
	Gamepad2Icon,
	Grid2X2Icon,
	SearchIcon,
	SpadeIcon,
	ZapIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GameCard } from "#/components/casino/shared/game-card";
import {
	type FilterDefinition,
	FilterGrid,
} from "#/components/interior/filter-grid";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { catalogueQueries } from "#/lib/queries/catalogue.queries";
import type { NormalizedGame } from "#/server/infra/providers/provider.types";

const categories: FilterDefinition<NormalizedGame>[] = [
	{
		id: "all",
		label: "All categories",
		icon: <Grid2X2Icon className="size-4" />,
		match: () => true,
	},
	{
		id: "slots",
		label: "Slots",
		icon: <Gamepad2Icon className="size-4" />,
		match: (game) => game.type === "slots",
	},
	{
		id: "crash",
		label: "Crash games",
		icon: <ZapIcon className="size-4" />,
		match: (game) => game.type === "crashgame",
	},
	{
		id: "roulette",
		label: "Roulette",
		icon: <CircleDotIcon className="size-4" />,
		match: (game) => game.type === "roulette",
	},
	{
		id: "baccarat",
		label: "Baccarat",
		icon: <SpadeIcon className="size-4" />,
		match: (game) => game.type === "baccarat",
	},
	{
		id: "instant",
		label: "Instant games",
		icon: <DicesIcon className="size-4" />,
		match: (game) => game.type === "instantgame",
	},
];

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

export function AuthenticatedLobby() {
	const [search, setSearch] = useState("");
	const columns = useCatalogueColumns();
	const catalogue = useQuery(catalogueQueries.games());
	const games = catalogue.data?.filter((game) => game.isAvailable) ?? [];
	const topPicks = games.slice(0, 6);
	const searchedGames = useMemo(() => {
		const query = search.trim().toLocaleLowerCase();
		if (!query) return games;
		return games.filter((game) =>
			`${game.name} ${game.provider}`.toLocaleLowerCase().includes(query),
		);
	}, [games, search]);

	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
			<section aria-labelledby="top-picks-title">
				<div className="mb-5 flex items-center gap-3">
					<span className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary">
						<FlameIcon className="size-5" />
					</span>
					<div>
						<p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
							Your casino
						</p>
						<h1
							id="top-picks-title"
							className="font-logo text-3xl text-foreground"
						>
							Top picks for you
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
								game={{ ...game, imageUrl: game.bannerUrl ?? game.coverUrl }}
							/>
						))}
					</div>
				)}
			</section>

			<section className="mt-12 pb-12" aria-labelledby="catalogue-title">
				<div className="mb-5">
					<p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
						Find your game
					</p>
					<h2
						id="catalogue-title"
						className="mt-1 font-logo text-3xl text-foreground sm:text-4xl"
					>
						Casino catalogue
					</h2>
				</div>

				<label htmlFor="catalogue-search" className="relative mb-5 block">
					<span className="sr-only">Search games</span>
					<SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="catalogue-search"
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search games..."
						className="h-14 rounded-xl border-white/8 bg-card pr-5 pl-13 text-base shadow-none placeholder:text-muted-foreground/65"
					/>
				</label>

				{catalogue.isPending ? (
					<CatalogueSkeleton />
				) : catalogue.isError ? (
					<div className="grid min-h-64 place-items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 text-center">
						<div>
							<p className="font-semibold text-foreground">
								The catalogue could not be loaded.
							</p>
							<button
								type="button"
								onClick={() => catalogue.refetch()}
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
								game={{ ...game, imageUrl: game.bannerUrl ?? game.coverUrl }}
							/>
						)}
					/>
				)}
			</section>
		</main>
	);
}
