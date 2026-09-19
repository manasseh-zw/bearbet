"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	DicesIcon,
	LoaderCircleIcon,
	RefreshCcwIcon,
	SearchIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { adminGameQueries } from "#/lib/queries/admin-game.queries";
import type {
	AdminGameAvailability,
	AdminGameCuration,
	AdminGameQuery,
	AdminGameSortFields,
	AdminGameStatuses,
	UpdateAdminGameInput,
} from "#/lib/schemas/admin-game.schema";
import {
	type listAdminGamesFn,
	syncAdminGamesFn,
	updateAdminGameFn,
} from "#/server/domains/admin/games/games.functions";

type AdminGameRow = Awaited<
	ReturnType<typeof listAdminGamesFn>
>["items"][number];
type GamePatch = Pick<
	UpdateAdminGameInput,
	"isEnabled" | "isFeatured" | "isPopular" | "isNew"
>;

type PendingChange = {
	gameId: string;
	gameName: string;
	label: string;
	patch: GamePatch;
};

const availabilityLabels: Record<AdminGameAvailability, string> = {
	all: "All availability",
	available: "Available",
	unavailable: "Unavailable",
};
const statusLabels: Record<AdminGameStatuses, string> = {
	all: "All statuses",
	enabled: "Enabled",
	disabled: "Disabled",
};
const curationLabels: Record<AdminGameCuration, string> = {
	all: "All curation",
	featured: "Featured",
	popular: "Popular",
	new: "New",
};
const sortLabels: Record<AdminGameSortFields, string> = {
	name: "Name",
	lastSeenAt: "Last seen",
	updatedAt: "Updated",
};

export function GamesPage({
	query,
	onQueryChange,
}: {
	query: AdminGameQuery;
	onQueryChange: (query: AdminGameQuery) => void;
}) {
	const queryClient = useQueryClient();
	const gamesQuery = useQuery(adminGameQueries.list(query));
	const [search, setSearch] = useState(query.search);
	const [pendingChange, setPendingChange] = useState<PendingChange | null>(
		null,
	);
	const [changeReason, setChangeReason] = useState("");
	const [syncOpen, setSyncOpen] = useState(false);
	const [syncReason, setSyncReason] = useState("");
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	useEffect(() => setSearch(query.search), [query.search]);

	const updateMutation = useMutation({
		mutationFn: async (reason: string) => {
			if (!pendingChange) throw new Error("Choose a game setting to change.");
			return updateAdminGameFn({
				data: {
					gameId: pendingChange.gameId,
					reason,
					...pendingChange.patch,
				},
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: adminGameQueries.all });
			setPendingChange(null);
			setChangeReason("");
			setActionError(null);
		},
		onError: (error) =>
			setActionError(
				error instanceof Error ? error.message : "The update failed.",
			),
	});

	const syncMutation = useMutation({
		mutationFn: (reason: string) => syncAdminGamesFn({ data: { reason } }),
		onSuccess: async (result) => {
			await queryClient.invalidateQueries({ queryKey: adminGameQueries.all });
			setSyncOpen(false);
			setSyncReason("");
			setSyncMessage(
				`Synced ${result.gameCount.toLocaleString()} provider games.`,
			);
			setActionError(null);
		},
		onError: (error) =>
			setActionError(
				error instanceof Error ? error.message : "The sync failed.",
			),
	});

	const rows = gamesQuery.data?.items ?? [];
	const filters = gamesQuery.data?.filters;
	const pageCount = gamesQuery.data?.pagination.totalPages ?? 1;
	const hasFilters = Boolean(
		query.search ||
			query.provider ||
			query.availability !== "all" ||
			query.status !== "all" ||
			query.curation !== "all",
	);

	function patchQuery(patch: Partial<AdminGameQuery>) {
		onQueryChange({ ...query, ...patch, page: patch.page ?? 1 });
	}

	function openChange(row: AdminGameRow, patch: GamePatch, label: string) {
		setActionError(null);
		setChangeReason("");
		setPendingChange({ gameId: row.id, gameName: row.name, patch, label });
	}

	function clearFilters() {
		setSearch("");
		onQueryChange({
			...query,
			search: "",
			provider: "",
			availability: "all",
			status: "all",
			curation: "all",
			page: 1,
		});
	}

	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
			<header className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Games
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Sync provider titles, control availability, and shape the player
						lobby with local curation.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge className="gap-1.5" variant="outline">
						<DicesIcon />
						{gamesQuery.data?.pagination.total ?? 0} games
					</Badge>
					<Button
						onClick={() => {
							setSyncMessage(null);
							setSyncOpen(true);
						}}
						disabled={syncMutation.isPending}
					>
						{syncMutation.isPending ? (
							<LoaderCircleIcon className="animate-spin" />
						) : (
							<RefreshCcwIcon />
						)}
						Sync catalogue
					</Button>
				</div>
			</header>

			{actionError ? (
				<div
					className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
					role="alert"
				>
					<span>{actionError}</span>
					<button
						type="button"
						aria-label="Dismiss error"
						onClick={() => setActionError(null)}
					>
						<XIcon className="size-4" />
					</button>
				</div>
			) : null}
			{syncMessage ? (
				<output className="mt-5 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-foreground">
					{syncMessage}
				</output>
			) : null}

			<div
				className="flex flex-col gap-3 py-5 xl:flex-row xl:items-center"
				role="toolbar"
				aria-label="Game filters"
			>
				<div className="relative min-w-0 flex-1 xl:max-w-xl">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Search games"
						className="h-9 pl-9"
						placeholder="Search name, provider, or ID"
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							patchQuery({ search: event.target.value });
						}}
					/>
				</div>
				<FilterSelect
					label="Provider"
					value={query.provider || "__all"}
					options={["__all", ...(filters?.providers ?? [])]}
					names={{ __all: "All providers" }}
					onChange={(value) =>
						patchQuery({ provider: value === "__all" ? "" : value })
					}
				/>
				<FilterSelect
					label="Availability"
					value={query.availability}
					options={Object.keys(availabilityLabels)}
					names={availabilityLabels}
					onChange={(value) =>
						patchQuery({ availability: value as AdminGameAvailability })
					}
				/>
				<FilterSelect
					label="Status"
					value={query.status}
					options={Object.keys(statusLabels)}
					names={statusLabels}
					onChange={(value) =>
						patchQuery({ status: value as AdminGameStatuses })
					}
				/>
				<FilterSelect
					label="Curation"
					value={query.curation}
					options={Object.keys(curationLabels)}
					names={curationLabels}
					onChange={(value) =>
						patchQuery({ curation: value as AdminGameCuration })
					}
				/>
				<Select
					value={query.sort}
					onValueChange={(value) =>
						patchQuery({ sort: value as AdminGameSortFields })
					}
				>
					<SelectTrigger aria-label="Sort games" className="h-9 w-full xl:w-32">
						<SelectValue>{sortLabels[query.sort]}</SelectValue>
					</SelectTrigger>
					<SelectContent align="start">
						{Object.entries(sortLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					aria-label={
						query.direction === "asc" ? "Sort descending" : "Sort ascending"
					}
					onClick={() =>
						patchQuery({
							direction: query.direction === "asc" ? "desc" : "asc",
						})
					}
					size="icon-sm"
					variant="outline"
				>
					{query.direction === "asc" ? <ArrowDownIcon /> : <ArrowUpIcon />}
				</Button>
				{hasFilters ? (
					<Button onClick={clearFilters} size="sm" variant="ghost">
						<XIcon data-icon="inline-start" /> Clear
					</Button>
				) : null}
			</div>

			<section aria-label="Game results">
				{gamesQuery.isError ? (
					<div
						className="grid min-h-56 place-items-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
						role="alert"
					>
						<div>
							<p className="font-medium">Games could not be loaded.</p>
							<Button
								className="mt-3"
								onClick={() => void gamesQuery.refetch()}
								variant="outline"
							>
								Retry
							</Button>
						</div>
					</div>
				) : gamesQuery.isPending ? (
					<GameListSkeleton />
				) : rows.length === 0 ? (
					<div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border p-8 text-center">
						<div>
							<p className="font-medium">No games match these filters.</p>
							<p className="mt-1 text-sm text-muted-foreground">
								{hasFilters
									? "Try a different search or clear the filters."
									: "Sync a provider catalogue to get started."}
							</p>
							{hasFilters ? (
								<Button
									className="mt-4"
									onClick={clearFilters}
									variant="outline"
								>
									Clear filters
								</Button>
							) : null}
						</div>
					</div>
				) : (
					<div className="space-y-3">
						{rows.map((row) => (
							<GameAdminRow key={row.id} row={row} onChange={openChange} />
						))}
						<footer className="flex flex-col gap-3 pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
							<span>
								Page {query.page} of {pageCount} ·{" "}
								{gamesQuery.data.pagination.total} games
							</span>
							<div className="flex gap-2">
								<Button
									disabled={query.page <= 1 || gamesQuery.isFetching}
									onClick={() => patchQuery({ page: query.page - 1 })}
									variant="outline"
								>
									Previous
								</Button>
								<Button
									disabled={query.page >= pageCount || gamesQuery.isFetching}
									onClick={() => patchQuery({ page: query.page + 1 })}
									variant="outline"
								>
									Next
								</Button>
							</div>
						</footer>
					</div>
				)}
			</section>

			<GameChangeDialog
				change={pendingChange}
				reason={changeReason}
				onReasonChange={setChangeReason}
				pending={updateMutation.isPending}
				error={
					updateMutation.isError
						? updateMutation.error instanceof Error
							? updateMutation.error.message
							: "The update failed."
						: null
				}
				onOpenChange={(open) => {
					if (!open && !updateMutation.isPending) setPendingChange(null);
				}}
				onSubmit={() => updateMutation.mutate(changeReason)}
			/>
			<SyncDialog
				open={syncOpen}
				reason={syncReason}
				onReasonChange={setSyncReason}
				pending={syncMutation.isPending}
				onOpenChange={setSyncOpen}
				onSubmit={() => syncMutation.mutate(syncReason)}
			/>
		</main>
	);
}

function GameAdminRow({
	row,
	onChange,
}: {
	row: AdminGameRow;
	onChange: (row: AdminGameRow, patch: GamePatch, label: string) => void;
}) {
	return (
		<article className="rounded-xl border border-border bg-card/40 p-3 sm:p-4">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20">
						{row.bannerUrl || row.coverUrl ? (
							<img
								alt=""
								className="size-full object-cover"
								loading="lazy"
								src={row.bannerUrl ?? row.coverUrl ?? undefined}
							/>
						) : (
							<span className="grid size-full place-items-center px-2 text-center text-xs text-muted-foreground">
								No artwork
							</span>
						)}
					</div>
					<div className="min-w-0">
						<h2 className="truncate font-medium">{row.name}</h2>
						<p className="mt-1 truncate text-xs text-muted-foreground">
							{row.contentProvider} · {row.externalId}
						</p>
						<div className="mt-2 flex flex-wrap gap-1.5">
							<Badge variant={row.isAvailable ? "outline" : "destructive"}>
								{row.isAvailable ? "Available" : "Unavailable"}
							</Badge>
							{row.isFeatured ? <Badge>Featured</Badge> : null}
							{row.isPopular ? (
								<Badge variant="secondary">Popular</Badge>
							) : null}
							{row.isNew ? <Badge variant="secondary">New</Badge> : null}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[34rem]">
					<GameSwitch
						checked={row.isEnabled}
						label="Enabled"
						onChange={(checked) =>
							onChange(
								row,
								{ isEnabled: checked },
								checked ? "Enable game" : "Disable game",
							)
						}
					/>
					<GameSwitch
						checked={row.isFeatured}
						label="Featured"
						onChange={(checked) =>
							onChange(
								row,
								{ isFeatured: checked },
								checked ? "Feature game" : "Remove featured flag",
							)
						}
					/>
					<GameSwitch
						checked={row.isPopular}
						label="Popular"
						onChange={(checked) =>
							onChange(
								row,
								{ isPopular: checked },
								checked ? "Mark popular" : "Remove popular flag",
							)
						}
					/>
					<GameSwitch
						checked={row.isNew}
						label="New"
						onChange={(checked) =>
							onChange(
								row,
								{ isNew: checked },
								checked ? "Mark new" : "Remove new flag",
							)
						}
					/>
				</div>
			</div>
		</article>
	);
}

function GameSwitch({
	checked,
	label,
	onChange,
}: {
	checked: boolean;
	label: string;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex min-h-9 items-center justify-between gap-2 rounded-lg bg-muted/45 px-3 text-xs text-muted-foreground">
			<span>{label}</span>
			<Switch
				aria-label={label}
				checked={checked}
				onCheckedChange={onChange}
				size="sm"
			/>
		</div>
	);
}

function FilterSelect({
	label,
	value,
	options,
	names,
	onChange,
}: {
	label: string;
	value: string;
	options: string[];
	names: Record<string, string>;
	onChange: (value: string) => void;
}) {
	return (
		<Select value={value} onValueChange={(next) => onChange(next ?? "")}>
			<SelectTrigger aria-label={label} className="h-9 w-full xl:w-40">
				<SelectValue>{names[value] ?? value}</SelectValue>
			</SelectTrigger>
			<SelectContent align="start">
				{options.map((option) => (
					<SelectItem key={option} value={option}>
						{names[option] ?? option}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function GameChangeDialog({
	change,
	reason,
	onReasonChange,
	pending,
	error,
	onOpenChange,
	onSubmit,
}: {
	change: PendingChange | null;
	reason: string;
	onReasonChange: (value: string) => void;
	pending: boolean;
	error: string | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: () => void;
}) {
	return (
		<Dialog open={Boolean(change)} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{change?.label}</DialogTitle>
					<DialogDescription>
						Record why this local game setting is changing for{" "}
						{change?.gameName}.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="game-change-reason">Reason</Label>
					<Textarea
						id="game-change-reason"
						value={reason}
						onChange={(event) => onReasonChange(event.target.value)}
						placeholder="Explain this curation decision"
						maxLength={500}
					/>
				</div>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<DialogFooter>
					<Button
						disabled={pending}
						onClick={() => onOpenChange(false)}
						variant="ghost"
					>
						Cancel
					</Button>
					<Button disabled={pending || !reason.trim()} onClick={onSubmit}>
						{pending ? <LoaderCircleIcon className="animate-spin" /> : null}
						Save change
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function SyncDialog({
	open,
	reason,
	onReasonChange,
	pending,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	reason: string;
	onReasonChange: (value: string) => void;
	pending: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Sync provider catalogue</DialogTitle>
					<DialogDescription>
						Refresh provider metadata. Local enabled and curation settings are
						preserved.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="game-sync-reason">Reason</Label>
					<Textarea
						id="game-sync-reason"
						value={reason}
						onChange={(event) => onReasonChange(event.target.value)}
						placeholder="Explain why the catalogue is being refreshed"
						maxLength={500}
					/>
				</div>
				<DialogFooter>
					<Button
						disabled={pending}
						onClick={() => onOpenChange(false)}
						variant="ghost"
					>
						Cancel
					</Button>
					<Button disabled={pending || !reason.trim()} onClick={onSubmit}>
						{pending ? (
							<LoaderCircleIcon className="animate-spin" />
						) : (
							<RefreshCcwIcon />
						)}
						Sync now
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function GameListSkeleton() {
	return (
		<output
			className="block space-y-3"
			aria-busy="true"
			aria-label="Loading games"
		>
			{Array.from(
				{ length: 6 },
				(_, index) => `game-list-loading-${index}`,
			).map((key) => (
				<div className="h-32 animate-pulse rounded-xl bg-muted/50" key={key} />
			))}
		</output>
	);
}
