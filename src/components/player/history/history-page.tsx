"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowDownLeftIcon,
	ArrowUpRightIcon,
	CoinsIcon,
	Gamepad2Icon,
	LoaderCircleIcon,
	RefreshCcwIcon,
	RotateCcwIcon,
	TrophyIcon,
	WalletCardsIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

import {
	AdminDataTable,
	type AdminTableColumn,
	AdminTablePagination,
} from "#/components/admin/data-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	MultiSelect,
	type MultiSelectOption,
} from "#/components/ui/multi-select";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { historyQueries } from "#/lib/queries/history.queries";
import {
	type HistoryCategory,
	type HistoryDirection,
	type HistoryOperationType,
	type HistoryQuery,
	type HistoryTimeRange,
	historyDirections,
	historyOperationTypes,
	historyTimeRanges,
} from "#/lib/schemas/history.schema";
import { cn } from "#/lib/utils";

const categoryOptions: {
	value: HistoryCategory;
	label: string;
}[] = [
	{ value: "all", label: "All" },
	{ value: "wallet", label: "Wallet" },
	{ value: "bet", label: "Bets" },
	{ value: "win", label: "Wins" },
	{ value: "refund", label: "Refunds" },
];

const transactionLabels: Record<HistoryOperationType, string> = {
	welcome_credit: "Welcome credit",
	demo_top_up: "Demo top-up",
	bet: "Bet placed",
	win: "Game win",
	refund: "Refund",
	withdrawal_reserve: "Withdrawal requested",
	withdrawal_release: "Withdrawal released",
	withdrawal_debit: "Withdrawal completed",
	bonus_credit: "Bonus credit",
	bonus_conversion: "Bonus converted",
	bonus_forfeit: "Bonus forfeited",
	admin_adjustment: "Balance adjustment",
	provider_reconciliation: "BigBang sandbox reconciliation",
};

const timeRangeLabels: Record<HistoryTimeRange, string> = {
	all: "All time",
	today: "Today",
};

const directionLabels: Record<HistoryDirection, string> = {
	desc: "Newest first",
	asc: "Oldest first",
};

const gameplayHistoryTypes = new Set<HistoryOperationType>([
	"bet",
	"win",
	"refund",
]);

function historyOperationOptions(
	category: HistoryCategory,
): MultiSelectOption[] {
	return historyOperationTypes
		.filter((type) => category !== "wallet" || !gameplayHistoryTypes.has(type))
		.map((type) => ({ value: type, label: transactionLabels[type] }));
}

const historyTableClassName =
	"[&_th]:h-11 [&_th]:px-4 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th:first-child]:pl-6 [&_th:last-child]:pr-6 [&_td]:px-4 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6";

type HistoryPageProps = {
	query: HistoryQuery;
	onQueryChange: (next: HistoryQuery) => void;
};

export function HistoryPage({ query, onQueryChange }: HistoryPageProps) {
	const history = useQuery(historyQueries.list(query));
	const reducedMotion = useReducedMotion();
	const currencyCode = history.data?.currencyCode ?? "USD";
	const money = useMemo(
		() =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: currencyCode,
				minimumFractionDigits: 2,
			}),
		[currencyCode],
	);
	const hasExtraFilters = Boolean(
		query.bucket ||
			query.type ||
			query.types.length ||
			query.timeRange !== "all" ||
			query.direction !== "desc",
	);

	function patchQuery(patch: Partial<HistoryQuery>) {
		onQueryChange({ ...query, ...patch, page: patch.page ?? 1 });
	}

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<header className="mb-7 flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">History</h1>
					<Badge variant="secondary">{currencyCode}</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Every wallet movement, bet, win, and refund in one place.
				</p>
			</header>

			<section aria-label="Transaction history" className="grid gap-5">
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-4">
						<p className="text-sm font-medium text-muted-foreground">
							Filter activity
						</p>
						{history.isFetching && !history.isPending ? (
							<LoaderCircleIcon
								className="size-4 animate-spin text-muted-foreground"
								aria-label="Refreshing history"
							/>
						) : null}
					</div>

					<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
						<div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
							<FilterSelect
								label="Activity view"
								className="sm:w-40"
								value={query.category}
								onChange={(value) =>
									patchQuery({
										category: value as HistoryCategory,
										type: undefined,
										types: [],
										bucket: value === "bet" ? undefined : query.bucket,
									})
								}
								options={categoryOptions.map(
									(tab) => [tab.value, tab.label] as const,
								)}
							/>
							{query.category !== "bet" ? (
								<FilterSelect
									label="Wallet bucket"
									className="sm:w-40"
									value={query.bucket ?? "all"}
									onChange={(value) =>
										patchQuery({
											bucket:
												value === "all"
													? undefined
													: (value as HistoryQuery["bucket"]),
										})
									}
									options={[
										["all", "All buckets"],
										["cash", "Cash"],
										["bonus", "Bonus"],
										["reserved_cash", "Reserved cash"],
									]}
								/>
							) : null}
							{query.category !== "bet" &&
							query.category !== "win" &&
							query.category !== "refund" ? (
								<MultiSelect
									ariaLabel="Operation types"
									className="sm:w-64"
									emptyLabel="All operations"
									onValuesChange={(values) =>
										patchQuery({
											type: undefined,
											types: values as HistoryOperationType[],
										})
									}
									options={historyOperationOptions(query.category)}
									searchPlaceholder="Search operations"
									values={
										query.types.length
											? query.types
											: query.type
												? [query.type]
												: []
									}
								/>
							) : null}
							<FilterSelect
								label="Period"
								className="sm:w-36"
								value={query.timeRange}
								onChange={(value) =>
									patchQuery({ timeRange: value as HistoryTimeRange })
								}
								options={historyTimeRanges.map(
									(value) => [value, timeRangeLabels[value]] as const,
								)}
							/>
							<FilterSelect
								label="Sort"
								className="sm:w-40"
								value={query.direction}
								onChange={(value) =>
									patchQuery({ direction: value as HistoryDirection })
								}
								options={historyDirections.map(
									(value) => [value, directionLabels[value]] as const,
								)}
							/>
						</div>
						{hasExtraFilters ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									onQueryChange({
										category: query.category,
										page: 1,
										type: undefined,
										types: [],
										bucket: undefined,
										timeRange: "all",
										direction: "desc",
									})
								}
							>
								<RotateCcwIcon data-icon="inline-start" />
								Clear filters
							</Button>
						) : null}
					</div>
				</div>

				<div className="overflow-hidden rounded-xl border border-border">
					{history.isPending ? (
						<HistorySkeleton />
					) : history.isError ? (
						<HistoryError
							isRetrying={history.isFetching}
							onRetry={() => history.refetch()}
						/>
					) : history.data ? (
						<AnimatePresence mode="wait" initial={false}>
							<motion.div
								key={`${query.category}:${query.page}:${query.bucket}:${query.type}:${query.types.join(",")}:${query.timeRange}:${query.direction}`}
								initial={reducedMotion ? false : { opacity: 0, y: 5 }}
								animate={{ opacity: 1, y: 0 }}
								exit={reducedMotion ? undefined : { opacity: 0, y: -3 }}
								transition={{ duration: reducedMotion ? 0 : 0.18 }}
							>
								{query.category === "bet" ? (
									<BetRoundsTable
										rounds={history.data.betRounds}
										money={money}
									/>
								) : (
									<HistoryTable items={history.data.items} money={money} />
								)}
							</motion.div>
						</AnimatePresence>
					) : null}
				</div>
				{history.data ? (
					<AdminTablePagination
						pageCount={history.data.pagination.totalPages}
						pageIndex={history.data.pagination.page - 1}
						onPageChange={(page) => patchQuery({ page: page + 1 })}
					/>
				) : null}
			</section>
		</main>
	);
}

function FilterSelect({
	label,
	value,
	onChange,
	options,
	className,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly (readonly [string, string])[];
	className?: string;
}) {
	return (
		<Select value={value} onValueChange={(next) => next && onChange(next)}>
			<SelectTrigger aria-label={label} className={cn("h-9 w-full", className)}>
				<SelectValue>
					{options.find(([optionValue]) => optionValue === value)?.[1] ?? value}
				</SelectValue>
			</SelectTrigger>
			<SelectContent align="start">
				<SelectGroup>
					{options.map(([optionValue, optionLabel]) => (
						<SelectItem key={optionValue} value={optionValue}>
							{optionLabel}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

type HistoryItem = Awaited<
	ReturnType<
		typeof import("#/server/domains/history/history.service").getPlayerHistory
	>
>["items"][number];

type BetRound = Awaited<
	ReturnType<
		typeof import("#/server/domains/history/history.service").getPlayerHistory
	>
>["betRounds"][number];

function HistoryTable({
	items,
	money,
}: {
	items: HistoryItem[];
	money: Intl.NumberFormat;
}) {
	const columns = useMemo<AdminTableColumn<HistoryItem>[]>(
		() => [
			{
				id: "activity",
				header: "Activity",
				cell: ({ row }) => {
					const item = row.original;
					const Icon = iconForType(item.type);
					const tone = transactionTone(item.type, item.amountMinor);
					return (
						<div className="flex items-center gap-3">
							<Icon className={cn("size-4 shrink-0", tone)} />
							<div className="min-w-0">
								<p>{transactionLabels[item.type]}</p>
								{item.gameName ? (
									<p className="mt-1 truncate text-xs text-muted-foreground">
										{item.gameName}
									</p>
								) : null}
								<p className="mt-1 text-xs text-muted-foreground sm:hidden">
									{formatDateTime(item.createdAt)}
								</p>
							</div>
						</div>
					);
				},
			},
			{
				id: "bucket",
				header: "Bucket",
				meta: {
					cellClassName: "hidden md:table-cell",
					headerClassName: "hidden md:table-cell",
				},
				cell: ({ row }) => (
					<div className="flex flex-wrap gap-1">
						{row.original.buckets.map((bucket) => (
							<Badge key={bucket} variant="outline" className="capitalize">
								{bucket.replace("_", " ")}
							</Badge>
						))}
					</div>
				),
			},
			{
				id: "reference",
				header: "Reference",
				meta: {
					cellClassName: "hidden max-w-52 lg:table-cell",
					headerClassName: "hidden lg:table-cell",
				},
				cell: ({ row }) => (
					<div>
						<p className="truncate text-sm">{row.original.publicReference}</p>
						{row.original.gameName && row.original.provider ? (
							<p className="text-xs capitalize text-muted-foreground">
								{row.original.provider}
							</p>
						) : null}
					</div>
				),
			},
			{
				id: "date",
				header: "Date",
				meta: {
					cellClassName: "hidden text-muted-foreground sm:table-cell",
					headerClassName: "hidden sm:table-cell",
				},
				cell: ({ row }) => formatDateTime(row.original.createdAt),
			},
			{
				id: "amount",
				header: "Amount",
				cell: ({ row }) => {
					const isCredit = row.original.amountMinor > 0;
					const tone = transactionTone(
						row.original.type,
						row.original.amountMinor,
					);
					return (
						<span className={cn("font-semibold tabular-nums", tone)}>
							{isCredit ? "+" : row.original.amountMinor < 0 ? "-" : ""}
							{formatMinorUnits(Math.abs(row.original.amountMinor), money)}
						</span>
					);
				},
			},
		],
		[money],
	);

	if (items.length === 0) {
		return <HistoryEmpty />;
	}

	return (
		<AdminDataTable
			columns={columns}
			data={items}
			getRowId={(row) => row.id}
			rowClassName="h-14"
			tableClassName={historyTableClassName}
		/>
	);
}

function BetRoundsTable({
	rounds,
	money,
}: {
	rounds: BetRound[];
	money: Intl.NumberFormat;
}) {
	const columns = useMemo<AdminTableColumn<BetRound>[]>(
		() => [
			{
				id: "game",
				header: "Game",
				cell: ({ row }) => {
					const tone = transactionTone("bet", row.original.netMinor);
					return (
						<div className="flex items-center gap-3">
							<Gamepad2Icon className={cn("size-4 shrink-0", tone)} />
							<div className="min-w-0">
								<p className="truncate font-medium">
									{row.original.gameName ?? "Casino game"}
								</p>
								<p className="mt-1 text-xs capitalize text-muted-foreground">
									{row.original.provider}
								</p>
							</div>
						</div>
					);
				},
			},
			{
				id: "result",
				header: "Result",
				meta: {
					cellClassName: "hidden md:table-cell",
					headerClassName: "hidden md:table-cell",
				},
				cell: ({ row }) => (
					<div>
						<p className="font-medium capitalize">{row.original.outcome}</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Stake {formatMinorUnits(row.original.stakeMinor, money)}
							{row.original.returnedMinor > 0
								? ` · Returned ${formatMinorUnits(row.original.returnedMinor, money)}`
								: ""}
							{row.original.refundedMinor > 0
								? ` · Refunded ${formatMinorUnits(row.original.refundedMinor, money)}`
								: ""}
						</p>
					</div>
				),
			},
			{
				id: "reference",
				header: "Reference",
				meta: {
					cellClassName: "hidden lg:table-cell",
					headerClassName: "hidden lg:table-cell",
				},
				cell: ({ row }) => (
					<p className="font-mono text-sm">{row.original.publicReference}</p>
				),
			},
			{
				id: "date",
				header: "Date",
				meta: {
					cellClassName: "hidden text-muted-foreground sm:table-cell",
					headerClassName: "hidden sm:table-cell",
				},
				cell: ({ row }) => formatDateTime(row.original.createdAt),
			},
			{
				id: "net",
				header: "Net",
				cell: ({ row }) => {
					const tone = transactionTone("bet", row.original.netMinor);
					return (
						<span className={cn("font-semibold tabular-nums", tone)}>
							{row.original.netMinor > 0
								? "+"
								: row.original.netMinor < 0
									? "-"
									: ""}
							{formatMinorUnits(Math.abs(row.original.netMinor), money)}
						</span>
					);
				},
			},
		],
		[money],
	);

	if (rounds.length === 0) return <HistoryEmpty icon="game" />;

	return (
		<AdminDataTable
			columns={columns}
			data={rounds}
			getRowId={(row) => row.id}
			rowClassName="h-14"
			tableClassName={historyTableClassName}
		/>
	);
}

function HistoryEmpty({ icon = "wallet" }: { icon?: "wallet" | "game" }) {
	const Icon = icon === "game" ? Gamepad2Icon : WalletCardsIcon;
	return (
		<div className="grid min-h-72 place-items-center px-6 py-12 text-center">
			<div className="flex max-w-sm flex-col items-center gap-2">
				<span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
					<Icon className="size-5" />
				</span>
				<p className="font-medium">No activity found</p>
				<p className="text-sm text-muted-foreground">
					Try another category or clear the detailed filters.
				</p>
			</div>
		</div>
	);
}

function HistorySkeleton() {
	return (
		<output aria-label="Loading history" className="block px-4 py-2 sm:px-6">
			{[1, 2, 3, 4, 5].map((key) => (
				<div
					key={key}
					className="flex h-16 items-center gap-3 border-b last:border-0"
				>
					<Skeleton className="size-4" />
					<div className="flex flex-1 flex-col gap-2">
						<Skeleton className="h-3.5 w-32" />
						<Skeleton className="h-3 w-20 sm:hidden" />
					</div>
					<Skeleton className="h-4 w-20" />
				</div>
			))}
		</output>
	);
}

function HistoryError({
	isRetrying,
	onRetry,
}: {
	isRetrying: boolean;
	onRetry: () => void;
}) {
	return (
		<div className="grid min-h-72 place-items-center px-6 py-12 text-center">
			<div className="flex max-w-sm flex-col items-center gap-3">
				<p className="font-medium">Your history could not be loaded</p>
				<p className="text-sm text-muted-foreground">
					Check your connection and try again.
				</p>
				<Button onClick={onRetry} disabled={isRetrying}>
					{isRetrying ? (
						<LoaderCircleIcon className="animate-spin" />
					) : (
						<RefreshCcwIcon data-icon="inline-start" />
					)}
					{isRetrying ? "Retrying..." : "Try again"}
				</Button>
			</div>
		</div>
	);
}

function iconForType(type: HistoryOperationType) {
	if (type === "bet") return Gamepad2Icon;
	if (type === "win") return TrophyIcon;
	if (type === "refund") return RefreshCcwIcon;
	if (type.startsWith("bonus")) return CoinsIcon;
	if (type.startsWith("withdrawal")) return ArrowUpRightIcon;
	if (type === "welcome_credit" || type === "demo_top_up")
		return ArrowDownLeftIcon;
	return WalletCardsIcon;
}

function transactionTone(type: HistoryOperationType, amountMinor: number) {
	if (type.startsWith("withdrawal")) return "text-foreground";
	if (amountMinor > 0) return "text-emerald-600 dark:text-emerald-400";
	if (amountMinor < 0) return "text-destructive";
	return "text-muted-foreground";
}

function formatMinorUnits(valueMinor: number, money: Intl.NumberFormat) {
	return money.format(valueMinor / 100);
}

function formatDateTime(value: Date | string) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
