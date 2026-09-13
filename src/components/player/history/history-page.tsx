"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowDownLeftIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
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
import { useId, useMemo } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { historyQueries } from "#/lib/queries/history.queries";
import {
	type HistoryCategory,
	type HistoryOperationType,
	type HistoryQuery,
	historyOperationTypes,
} from "#/lib/schemas/history.schema";
import { cn } from "#/lib/utils";

const categoryTabs: {
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
};

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
		query.bucket || query.type || query.from || query.to,
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

			<section
				aria-label="Transaction history"
				className="overflow-hidden rounded-2xl border bg-card shadow-none"
			>
				<div className="flex flex-col px-4 pt-4 sm:px-6">
					<div className="flex items-center justify-between gap-4">
						<Tabs
							className="min-w-0"
							value={query.category}
							onValueChange={(value) =>
								patchQuery({
									category: value as HistoryCategory,
									type: undefined,
									bucket: value === "bet" ? undefined : query.bucket,
								})
							}
						>
							<div className="overflow-x-auto">
								<TabsList variant="line" aria-label="Activity category">
									{categoryTabs.map((tab) => (
										<TabsTrigger
											key={tab.value}
											value={tab.value}
											className="gap-2 px-2.5 data-active:text-primary data-active:after:bg-primary"
										>
											{tab.label}
											<span className="rounded-full border px-1.5 text-[11px] leading-4 text-muted-foreground tabular-nums">
												{history.data?.counts[tab.value] ?? 0}
											</span>
										</TabsTrigger>
									))}
								</TabsList>
							</div>
						</Tabs>
						{history.isFetching && !history.isPending ? (
							<LoaderCircleIcon
								className="size-4 animate-spin text-muted-foreground"
								aria-label="Refreshing history"
							/>
						) : null}
					</div>

					<div className="flex flex-col gap-3 pt-6 pb-4 lg:flex-row lg:items-end">
						<div
							className={cn(
								"grid flex-1 grid-cols-2 gap-3",
								query.category === "bet" ? "sm:grid-cols-2" : "sm:grid-cols-4",
							)}
						>
							{query.category !== "bet" ? (
								<FilterSelect
									label="Wallet bucket"
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
							{query.category !== "bet" ? (
								<FilterSelect
									label="Operation"
									value={query.type ?? "all"}
									onChange={(value) =>
										patchQuery({
											type:
												value === "all"
													? undefined
													: (value as HistoryOperationType),
										})
									}
									options={[
										["all", "All operations"],
										...historyOperationTypes.map(
											(type) => [type, transactionLabels[type]] as const,
										),
									]}
								/>
							) : null}
							<DateFilter
								label="From"
								value={query.from ?? ""}
								onChange={(value) => patchQuery({ from: value || undefined })}
							/>
							<DateFilter
								label="To"
								value={query.to ?? ""}
								onChange={(value) => patchQuery({ to: value || undefined })}
							/>
						</div>
						{hasExtraFilters ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									onQueryChange({ category: query.category, page: 1 })
								}
							>
								<RotateCcwIcon data-icon="inline-start" />
								Clear filters
							</Button>
						) : null}
					</div>
				</div>

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
							key={`${query.category}:${query.page}:${query.bucket}:${query.type}:${query.from}:${query.to}`}
							initial={reducedMotion ? false : { opacity: 0, y: 5 }}
							animate={{ opacity: 1, y: 0 }}
							exit={reducedMotion ? undefined : { opacity: 0, y: -3 }}
							transition={{ duration: reducedMotion ? 0 : 0.18 }}
						>
							{query.category === "bet" ? (
								<BetRoundsTable rounds={history.data.betRounds} money={money} />
							) : (
								<HistoryTable items={history.data.items} money={money} />
							)}
							<HistoryPagination
								page={history.data.pagination.page}
								total={history.data.pagination.total}
								totalPages={history.data.pagination.totalPages}
								onPageChange={(page) => patchQuery({ page })}
							/>
						</motion.div>
					</AnimatePresence>
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
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly (readonly [string, string])[];
}) {
	const id = useId();
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<Label htmlFor={id} className="text-xs">
				{label}
			</Label>
			<Select value={value} onValueChange={(next) => next && onChange(next)}>
				<SelectTrigger id={id} className="w-full bg-background">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{options.map(([optionValue, optionLabel]) => (
							<SelectItem key={optionValue} value={optionValue}>
								{optionLabel}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}

function DateFilter({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = useId();
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<Label htmlFor={id} className="text-xs">
				{label}
			</Label>
			<Input
				id={id}
				type="date"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="w-full bg-background"
			/>
		</div>
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
	if (items.length === 0) {
		return (
			<div className="grid min-h-72 place-items-center border-t px-6 py-12 text-center">
				<div className="flex max-w-sm flex-col items-center gap-2">
					<span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
						<WalletCardsIcon className="size-5" />
					</span>
					<p className="font-medium">No activity found</p>
					<p className="text-sm text-muted-foreground">
						Try another category or clear the detailed filters.
					</p>
				</div>
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-t bg-muted/30 hover:bg-muted/30">
					<TableHead className="h-11 pl-6 text-xs uppercase tracking-wide text-muted-foreground">
						Activity
					</TableHead>
					<TableHead className="hidden text-xs uppercase tracking-wide text-muted-foreground md:table-cell">
						Bucket
					</TableHead>
					<TableHead className="hidden text-xs uppercase tracking-wide text-muted-foreground lg:table-cell">
						Reference
					</TableHead>
					<TableHead className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:table-cell">
						Date
					</TableHead>
					<TableHead className="pr-6 text-right text-xs uppercase tracking-wide text-muted-foreground">
						Amount
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item) => {
					const isCredit = item.amountMinor > 0;
					const Icon = iconForType(item.type);
					const tone = transactionTone(item.type, item.amountMinor);
					return (
						<TableRow key={item.id} className="h-16">
							<TableCell className="pl-6">
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
							</TableCell>
							<TableCell className="hidden md:table-cell">
								<div className="flex flex-wrap gap-1">
									{item.buckets.map((bucket) => (
										<Badge
											key={bucket}
											variant="outline"
											className="capitalize"
										>
											{bucket.replace("_", " ")}
										</Badge>
									))}
								</div>
							</TableCell>
							<TableCell className="hidden max-w-52 lg:table-cell">
								<p className="truncate text-sm">{item.publicReference}</p>
								{item.gameName && item.provider ? (
									<p className="text-xs capitalize text-muted-foreground">
										{item.provider}
									</p>
								) : null}
							</TableCell>
							<TableCell className="hidden text-muted-foreground sm:table-cell">
								{formatDateTime(item.createdAt)}
							</TableCell>
							<TableCell
								className={cn(
									"pr-6 text-right font-semibold tabular-nums",
									tone,
								)}
							>
								{isCredit ? "+" : item.amountMinor < 0 ? "-" : ""}
								{formatMinorUnits(Math.abs(item.amountMinor), money)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

function BetRoundsTable({
	rounds,
	money,
}: {
	rounds: BetRound[];
	money: Intl.NumberFormat;
}) {
	if (rounds.length === 0) return <HistoryEmpty icon="game" />;

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-t bg-muted/30 hover:bg-muted/30">
					<TableHead className="h-11 pl-6 text-xs uppercase tracking-wide text-muted-foreground">
						Game
					</TableHead>
					<TableHead className="hidden text-xs uppercase tracking-wide text-muted-foreground md:table-cell">
						Result
					</TableHead>
					<TableHead className="hidden text-xs uppercase tracking-wide text-muted-foreground lg:table-cell">
						Reference
					</TableHead>
					<TableHead className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:table-cell">
						Date
					</TableHead>
					<TableHead className="pr-6 text-right text-xs uppercase tracking-wide text-muted-foreground">
						Net
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rounds.map((round) => {
					const tone = transactionTone("bet", round.netMinor);
					return (
						<TableRow key={round.id} className="h-16">
							<TableCell className="max-w-64 pl-6">
								<div className="flex items-center gap-3">
									<Gamepad2Icon className={cn("size-4 shrink-0", tone)} />
									<div className="min-w-0">
										<p className="truncate font-medium">
											{round.gameName ?? "Casino game"}
										</p>
										<p className="mt-1 text-xs capitalize text-muted-foreground">
											{round.provider}
										</p>
									</div>
								</div>
							</TableCell>
							<TableCell className="hidden md:table-cell">
								<p className="font-medium capitalize">{round.outcome}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Stake {formatMinorUnits(round.stakeMinor, money)}
									{round.returnedMinor > 0
										? ` · Returned ${formatMinorUnits(round.returnedMinor, money)}`
										: ""}
									{round.refundedMinor > 0
										? ` · Refunded ${formatMinorUnits(round.refundedMinor, money)}`
										: ""}
								</p>
							</TableCell>
							<TableCell className="hidden lg:table-cell">
								<p className="font-mono text-sm">{round.publicReference}</p>
							</TableCell>
							<TableCell className="hidden text-muted-foreground sm:table-cell">
								{formatDateTime(round.createdAt)}
							</TableCell>
							<TableCell
								className={cn(
									"pr-6 text-right font-semibold tabular-nums",
									tone,
								)}
							>
								{round.netMinor > 0 ? "+" : round.netMinor < 0 ? "-" : ""}
								{formatMinorUnits(Math.abs(round.netMinor), money)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

function HistoryEmpty({ icon = "wallet" }: { icon?: "wallet" | "game" }) {
	const Icon = icon === "game" ? Gamepad2Icon : WalletCardsIcon;
	return (
		<div className="grid min-h-72 place-items-center border-t px-6 py-12 text-center">
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

function HistoryPagination({
	page,
	total,
	totalPages,
	onPageChange,
}: {
	page: number;
	total: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	return (
		<footer className="flex items-center justify-between gap-4 border-t px-4 py-4 text-sm sm:px-6">
			<p className="text-muted-foreground">
				<span className="font-medium text-foreground tabular-nums">
					{total}
				</span>{" "}
				{total === 1 ? "entry" : "entries"}
			</p>
			<div className="flex items-center gap-3">
				<Button
					variant="outline"
					size="icon-sm"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
					aria-label="Previous page"
				>
					<ArrowLeftIcon />
				</Button>
				<span className="text-muted-foreground tabular-nums">
					Page <span className="font-medium text-foreground">{page}</span> of{" "}
					{totalPages}
				</span>
				<Button
					variant="outline"
					size="icon-sm"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
					aria-label="Next page"
				>
					<ArrowRightIcon />
				</Button>
			</div>
		</footer>
	);
}

function HistorySkeleton() {
	return (
		<output
			aria-label="Loading history"
			className="block border-t px-4 py-2 sm:px-6"
		>
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
		<div className="grid min-h-72 place-items-center border-t px-6 py-12 text-center">
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
