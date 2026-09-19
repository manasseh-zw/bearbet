"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	LoaderCircleIcon,
	SearchIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { GameCard, type GameCardGame } from "#/components/casino/game-card";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { catalogueQueries } from "#/lib/queries/catalogue.queries";
import type {
	CatalogueRouteSearch,
	CatalogueSearch,
} from "#/lib/schemas/catalogue.schema";
import { cn } from "#/lib/utils";

type GameCatalogueProps = {
	query: CatalogueRouteSearch;
	onQueryChange: (query: CatalogueRouteSearch) => void;
	scope: CatalogueSearch["scope"];
	priorityCategories?: readonly string[];
	title: string;
	eyebrow?: string;
	topMargin?: "mt-0" | "mt-12";
	specialCollections?: Array<{
		value: "favorites" | "recent";
		label: string;
		count: number;
	}>;
	collectionGames?: GameCardGame[];
	collectionPending?: boolean;
	collectionError?: boolean;
	favoriteGameIds?: ReadonlySet<string>;
	onToggleFavorite?: (gameId: string, isFavorite: boolean) => void;
	favoritePending?: boolean;
};

const skeletonKeys = Array.from(
	{ length: 12 },
	(_, index) => `catalogue-skeleton-${index + 1}`,
);

export function GameCatalogue({
	query,
	onQueryChange,
	scope,
	priorityCategories = [],
	title,
	eyebrow = "Browse the catalogue",
	topMargin = "mt-12",
	specialCollections = [],
	collectionGames = [],
	collectionPending = false,
	collectionError = false,
	favoriteGameIds,
	onToggleFavorite,
	favoritePending = false,
}: GameCatalogueProps) {
	const searchId = useId();
	const [draft, setDraft] = useState(query.q);
	const collection = query.collection;
	const catalogue = useQuery(
		catalogueQueries.search({
			q: query.q,
			category: query.category,
			scope,
			page: query.page,
			pageSize: 48,
		}),
	);

	useEffect(() => setDraft(query.q), [query.q]);
	useEffect(() => {
		if (draft.trim() === query.q) return;
		const timeout = window.setTimeout(
			() =>
				onQueryChange({
					...query,
					q: draft.trim(),
					collection: undefined,
					page: 1,
				}),
			180,
		);
		return () => window.clearTimeout(timeout);
	}, [draft, onQueryChange, query]);

	const categories = useMemo(() => {
		const priority = new Map(
			priorityCategories.map((category, index) => [category, index]),
		);
		return [...(catalogue.data?.categories ?? [])].sort((left, right) => {
			const leftPriority = priority.get(left.value);
			const rightPriority = priority.get(right.value);
			if (leftPriority !== undefined || rightPriority !== undefined) {
				if (leftPriority === undefined) return 1;
				if (rightPriority === undefined) return -1;
				return leftPriority - rightPriority;
			}
			return right.count - left.count || left.value.localeCompare(right.value);
		});
	}, [catalogue.data?.categories, priorityCategories]);

	function patchQuery(patch: Partial<CatalogueRouteSearch>) {
		onQueryChange({ ...query, ...patch, page: patch.page ?? 1 });
	}

	const isCollection = Boolean(collection);
	const collectionTitle =
		collection === "favorites"
			? "Your favorites"
			: collection === "recent"
				? "Recently played"
				: title;
	const collectionResult = isCollection ? collectionGames : null;
	const total = collectionResult
		? collectionResult.length
		: (catalogue.data?.total ?? 0);
	const games: GameCardGame[] = collectionResult
		? collectionResult
		: (catalogue.data?.games ?? []).map((game) => ({
				...game,
				imageUrl: game.bannerUrl ?? game.coverUrl,
			}));
	const isPending = collectionResult ? collectionPending : catalogue.isPending;
	const isError = collectionResult ? collectionError : catalogue.isError;

	return (
		<section
			className={`${topMargin} pb-12`}
			aria-labelledby={`${searchId}-title`}
		>
			<div className="mb-5 flex items-end justify-between gap-4">
				<div>
					<p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
						{eyebrow}
					</p>
					<h2
						id={`${searchId}-title`}
						className="mt-1 font-logo text-3xl text-foreground sm:text-4xl"
					>
						{collectionTitle}
					</h2>
				</div>
				{isCollection || catalogue.data ? (
					<p className="shrink-0 text-sm text-muted-foreground tabular-nums">
						{total.toLocaleString()} {total === 1 ? "game" : "games"}
					</p>
				) : null}
			</div>

			<div className="relative mb-4">
				<label htmlFor={`${searchId}-input`} className="sr-only">
					Search games
				</label>
				<SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input
					id={`${searchId}-input`}
					type="search"
					value={draft}
					maxLength={80}
					onChange={(event) => setDraft(event.target.value)}
					placeholder="Search by game, provider, or category"
					autoComplete="off"
					className="h-12 rounded-xl border-white/8 bg-card pr-20 pl-11 text-base shadow-none placeholder:text-muted-foreground/65"
				/>
				<div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
					{catalogue.isFetching && !isCollection ? (
						<LoaderCircleIcon
							className="size-4 animate-spin text-muted-foreground"
							aria-label="Searching"
						/>
					) : null}
					{draft ? (
						<button
							type="button"
							onClick={() => {
								setDraft("");
								patchQuery({ q: "", collection: undefined, page: 1 });
							}}
							className="grid size-7 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-white/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
							aria-label="Clear search"
						>
							<XIcon className="size-4" />
						</button>
					) : null}
				</div>
			</div>

			{categories.length > 0 ||
			query.category ||
			specialCollections.length > 0 ? (
				<fieldset className="scrollbar-none mb-7 flex gap-2 overflow-x-auto pb-1">
					<legend className="sr-only">Game category</legend>
					{specialCollections.map((item) => (
						<CategoryButton
							key={item.value}
							active={collection === item.value}
							label={item.label}
							count={item.count}
							onClick={() =>
								patchQuery({
									collection: item.value,
									category: undefined,
									q: "",
									page: 1,
								})
							}
						/>
					))}
					<CategoryButton
						active={!query.category && !collection}
						label="All categories"
						onClick={() =>
							patchQuery({ category: undefined, collection: undefined })
						}
					/>
					{categories.map((category) => (
						<CategoryButton
							key={category.value}
							active={query.category === category.value}
							label={category.value}
							count={category.count}
							onClick={() =>
								patchQuery({ category: category.value, collection: undefined })
							}
						/>
					))}
				</fieldset>
			) : null}

			{isPending ? (
				<CatalogueSkeleton />
			) : isError ? (
				<div className="grid min-h-64 place-items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 text-center">
					<div>
						<p className="font-semibold text-foreground">
							The catalogue could not be loaded.
						</p>
						<Button
							variant="link"
							onClick={() => void catalogue.refetch()}
							className="mt-1"
						>
							Try again
						</Button>
					</div>
				</div>
			) : games.length === 0 ? (
				<div className="grid min-h-64 place-items-center rounded-xl border border-white/8 bg-card px-6 text-center">
					<div>
						<p className="font-semibold text-foreground">
							{collection === "favorites"
								? "No favorites yet."
								: collection === "recent"
									? "No recently played games yet."
									: "No games match your search."}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{collection
								? "Use the catalogue to build this collection as you play."
								: "Check the spelling or clear the category filter."}
						</p>
						{query.q || query.category || query.collection ? (
							<Button
								variant="outline"
								size="sm"
								className="mt-4"
								onClick={() => {
									setDraft("");
									onQueryChange({ q: "", page: 1 });
								}}
							>
								Clear filters
							</Button>
						) : null}
					</div>
				</div>
			) : (
				<div
					className={cn(
						"transition-opacity",
						catalogue.isPlaceholderData && !isCollection && "opacity-55",
					)}
					aria-busy={isCollection ? collectionPending : catalogue.isFetching}
				>
					<ul className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
						{games.map((game) => (
							<li key={game.id} className="min-w-0">
								<GameCard
									playable
									game={{
										...game,
										isFavorite: favoriteGameIds?.has(game.id),
									}}
									onToggleFavorite={
										onToggleFavorite
											? () =>
													onToggleFavorite(
														game.id,
														!favoriteGameIds?.has(game.id),
													)
											: undefined
									}
									favoritePending={favoritePending}
								/>
							</li>
						))}
					</ul>
					{!isCollection && catalogue.data && catalogue.data.pageCount > 1 ? (
						<nav
							className="mt-8 flex items-center justify-center gap-3"
							aria-label="Catalogue pages"
						>
							<Button
								variant="outline"
								size="sm"
								disabled={query.page <= 1 || catalogue.isFetching}
								onClick={() => patchQuery({ page: query.page - 1 })}
							>
								<ChevronLeftIcon data-icon="inline-start" /> Previous
							</Button>
							<span className="min-w-20 text-center text-sm text-muted-foreground tabular-nums">
								{query.page} of {catalogue.data.pageCount}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={
									query.page >= catalogue.data.pageCount || catalogue.isFetching
								}
								onClick={() => patchQuery({ page: query.page + 1 })}
							>
								Next <ChevronRightIcon data-icon="inline-end" />
							</Button>
						</nav>
					) : null}
				</div>
			)}
		</section>
	);
}

function CategoryButton({
	active,
	label,
	count,
	onClick,
}: {
	active: boolean;
	label: string;
	count?: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"inline-flex h-9 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-white/8 bg-card text-muted-foreground hover:text-foreground",
			)}
		>
			{label}
			{count !== undefined ? (
				<span className="text-xs tabular-nums opacity-70">{count}</span>
			) : null}
		</button>
	);
}

function CatalogueSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
			{skeletonKeys.map((key) => (
				<div key={key} className="space-y-2">
					<Skeleton className="aspect-[4/5] rounded-xl" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			))}
		</div>
	);
}
