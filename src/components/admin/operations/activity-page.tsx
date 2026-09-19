"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { RowData } from "@tanstack/react-table";
import {
	ArrowDownLeftIcon,
	ArrowUpRightIcon,
	BadgeCheckIcon,
	ChevronDownIcon,
	FileClockIcon,
	Gamepad2Icon,
	LoaderCircleIcon,
	SearchIcon,
	WalletCardsIcon,
	XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import {
	AdminDataTable,
	type AdminTableColumn,
	AdminTableEmpty,
	AdminTableError,
	AdminTableLoading,
	AdminTableMobileList,
	AdminTableToolbar,
} from "#/components/admin/data-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { adminOperationsQueries } from "#/lib/queries/admin-operations.queries";
import type {
	AdminActivityQuery,
	AdminActivityTab,
	AdminWithdrawalStatus,
} from "#/lib/schemas/admin-operations.schema";
import { listAdminActivityFn } from "#/server/domains/admin/operations/operations.functions";

type ActivityPage = Awaited<ReturnType<typeof listAdminActivityFn>>;
type WalletPage = Extract<ActivityPage, { tab: "wallet" }>;
type GameplayPage = Extract<ActivityPage, { tab: "gameplay" }>;
type WithdrawalPage = Extract<ActivityPage, { tab: "withdrawals" }>;
type AuditPage = Extract<ActivityPage, { tab: "audit" }>;
type WalletRow = WalletPage["items"][number];
type GameplayRow = GameplayPage["items"][number];
type WithdrawalRow = WithdrawalPage["items"][number];
type AuditRow = AuditPage["items"][number];

const tabLabels: Record<AdminActivityTab, string> = {
	wallet: "Wallet",
	gameplay: "Gameplay",
	withdrawals: "Withdrawals",
	audit: "Audit trail",
};

const walletTypeLabels: Record<string, string> = {
	all: "All wallet operations",
	welcome_credit: "Welcome credit",
	demo_top_up: "Demo top-up",
	withdrawal_reserve: "Withdrawal reserved",
	withdrawal_release: "Withdrawal released",
	withdrawal_debit: "Withdrawal completed",
	bonus_credit: "Bonus credit",
	bonus_conversion: "Bonus conversion",
	bonus_forfeit: "Bonus forfeited",
	admin_adjustment: "Admin adjustment",
	provider_reconciliation: "Provider reconciliation",
};

const gameplayTypeLabels: Record<string, string> = {
	all: "All gameplay operations",
	bet: "Bets",
	win: "Wins",
	refund: "Refunds",
};

const statusLabels: Record<AdminWithdrawalStatus, string> = {
	all: "All decisions",
	pending: "Pending",
	approved: "Approved",
	rejected: "Rejected",
};

export function ActivityPage({
	query,
	onQueryChange,
}: {
	query: AdminActivityQuery;
	onQueryChange: (query: AdminActivityQuery) => void;
}) {
	const activityQuery = useInfiniteQuery({
		queryKey: [...adminOperationsQueries.all, "activity", query] as const,
		queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
			listAdminActivityFn({ data: { ...query, cursor: pageParam } }),
		initialPageParam: query.cursor,
		getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
		staleTime: 5_000,
	});
	const [search, setSearch] = useState(query.search);

	const pages = activityQuery.data?.pages ?? [];
	const hasFilters = Boolean(
		query.search || query.type || query.withdrawalStatus !== "all",
	);

	function patchQuery(patch: Partial<AdminActivityQuery>) {
		onQueryChange({ ...query, ...patch, cursor: undefined });
	}

	function changeTab(value: string | null) {
		if (!value || !isActivityTab(value)) return;
		setSearch("");
		onQueryChange({
			...query,
			tab: value,
			search: "",
			type: undefined,
			withdrawalStatus: "all",
			cursor: undefined,
		});
	}

	const typeOptions =
		query.tab === "wallet" ? walletTypeLabels : gameplayTypeLabels;
	const showTypeFilter = query.tab === "wallet" || query.tab === "gameplay";

	return (
		<main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
			<header className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-logo text-3xl leading-none tracking-tight sm:text-4xl">
						Activity
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Follow immutable wallet movements, gameplay callbacks, withdrawal
						decisions, and their audit evidence.
					</p>
				</div>
				<Badge className="w-fit gap-1.5" variant="outline">
					<FileClockIcon />
					Operational record
				</Badge>
			</header>

			<Tabs value={query.tab} onValueChange={changeTab}>
				<TabsList className="w-full max-w-xl sm:w-fit">
					{(Object.keys(tabLabels) as AdminActivityTab[]).map((tab) => (
						<TabsTrigger key={tab} value={tab}>
							{tabLabels[tab]}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<AdminTableToolbar ariaLabel="Activity filters">
				<div className="relative min-w-0 flex-1 lg:max-w-md">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Search activity"
						className="h-9 pl-9"
						placeholder={
							query.tab === "audit"
								? "Search action, reason, or actor"
								: "Search player name or email"
						}
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							patchQuery({ search: event.target.value });
						}}
					/>
				</div>
				{showTypeFilter ? (
					<Select
						value={query.type ?? "all"}
						onValueChange={(value) =>
							patchQuery({
								type:
									value === "all"
										? undefined
										: (value as AdminActivityQuery["type"]),
							})
						}
					>
						<SelectTrigger
							aria-label="Activity operation type"
							className="h-9 w-full lg:w-48"
						>
							<SelectValue>{typeOptions[query.type ?? "all"]}</SelectValue>
						</SelectTrigger>
						<SelectContent align="start">
							{Object.entries(typeOptions).map(([value, label]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
				{query.tab === "withdrawals" ? (
					<Select
						value={query.withdrawalStatus}
						onValueChange={(value) =>
							patchQuery({
								withdrawalStatus: (value ?? "all") as AdminWithdrawalStatus,
							})
						}
					>
						<SelectTrigger
							aria-label="Withdrawal decision"
							className="h-9 w-full lg:w-40"
						>
							<SelectValue>{statusLabels[query.withdrawalStatus]}</SelectValue>
						</SelectTrigger>
						<SelectContent align="start">
							{Object.entries(statusLabels).map(([value, label]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
				{hasFilters ? (
					<Button
						onClick={() => {
							setSearch("");
							onQueryChange({
								...query,
								search: "",
								type: undefined,
								withdrawalStatus: "all",
								cursor: undefined,
							});
						}}
						size="sm"
						variant="ghost"
					>
						<XIcon data-icon="inline-start" />
						Clear
					</Button>
				) : null}
			</AdminTableToolbar>

			<section aria-label={`${tabLabels[query.tab]} activity`} className="pt-5">
				{activityQuery.isError ? (
					<AdminTableError
						onRetry={() => void activityQuery.refetch()}
						title="Activity could not be loaded."
					/>
				) : activityQuery.isPending ? (
					<AdminTableLoading />
				) : (
					<ActivityResults
						pages={pages}
						tab={query.tab}
						hasFilters={hasFilters}
						onLoadMore={() => void activityQuery.fetchNextPage()}
						hasNextPage={activityQuery.hasNextPage}
						loadingMore={activityQuery.isFetchingNextPage}
					/>
				)}
			</section>
		</main>
	);
}

function ActivityResults({
	pages,
	tab,
	hasFilters,
	onLoadMore,
	hasNextPage,
	loadingMore,
}: {
	pages: ActivityPage[];
	tab: AdminActivityTab;
	hasFilters: boolean;
	onLoadMore: () => void;
	hasNextPage: boolean;
	loadingMore: boolean;
}) {
	if (tab === "wallet") {
		const rows = pages.flatMap((page) =>
			page.tab === "wallet" ? page.items : [],
		) as WalletRow[];
		if (!rows.length)
			return (
				<EmptyActivity
					hasFilters={hasFilters}
					label="wallet movements"
					icon={<WalletCardsIcon />}
				/>
			);
		return (
			<ActivityTable
				columns={walletColumns()}
				rows={rows}
				getKey={(row) => row.operation.id}
				mobile={(row) => <WalletMobileRow row={row} />}
				hasNextPage={hasNextPage}
				loadingMore={loadingMore}
				onLoadMore={onLoadMore}
			/>
		);
	}
	if (tab === "gameplay") {
		const rows = pages.flatMap((page) =>
			page.tab === "gameplay" ? page.items : [],
		) as GameplayRow[];
		if (!rows.length)
			return (
				<EmptyActivity
					hasFilters={hasFilters}
					label="gameplay operations"
					icon={<Gamepad2Icon />}
				/>
			);
		return (
			<ActivityTable
				columns={gameplayColumns()}
				rows={rows}
				getKey={(row) => row.operation.id}
				mobile={(row) => <GameplayMobileRow row={row} />}
				hasNextPage={hasNextPage}
				loadingMore={loadingMore}
				onLoadMore={onLoadMore}
			/>
		);
	}
	if (tab === "withdrawals") {
		const rows = pages.flatMap((page) =>
			page.tab === "withdrawals" ? page.items : [],
		) as WithdrawalRow[];
		if (!rows.length)
			return (
				<EmptyActivity
					hasFilters={hasFilters}
					label="withdrawal decisions"
					icon={<ArrowUpRightIcon />}
				/>
			);
		return (
			<ActivityTable
				columns={withdrawalColumns()}
				rows={rows}
				getKey={(row) => row.withdrawal.id}
				mobile={(row) => <WithdrawalMobileRow row={row} />}
				hasNextPage={hasNextPage}
				loadingMore={loadingMore}
				onLoadMore={onLoadMore}
			/>
		);
	}

	const rows = pages.flatMap((page) =>
		page.tab === "audit" ? page.items : [],
	) as AuditRow[];
	if (!rows.length)
		return (
			<EmptyActivity
				hasFilters={hasFilters}
				label="audit entries"
				icon={<BadgeCheckIcon />}
			/>
		);
	return (
		<ActivityTable
			columns={auditColumns()}
			rows={rows}
			getKey={(row) => row.id}
			mobile={(row) => <AuditMobileRow row={row} />}
			hasNextPage={hasNextPage}
			loadingMore={loadingMore}
			onLoadMore={onLoadMore}
		/>
	);
}

function ActivityTable<TData extends RowData>({
	columns,
	rows,
	getKey,
	mobile,
	hasNextPage,
	loadingMore,
	onLoadMore,
}: {
	columns: AdminTableColumn<TData>[];
	rows: TData[];
	getKey: (row: TData) => string;
	mobile: (row: TData) => ReactNode;
	hasNextPage: boolean;
	loadingMore: boolean;
	onLoadMore: () => void;
}) {
	return (
		<>
			<div className="hidden overflow-hidden rounded-xl border border-border md:block">
				<AdminDataTable
					columns={columns}
					data={rows}
					getRowId={getKey}
					rowClassName="[&>td]:px-4 [&>td]:py-3"
					tableClassName="[&_th]:px-4"
				/>
			</div>
			<AdminTableMobileList getKey={getKey} items={rows} renderItem={mobile} />
			{hasNextPage ? (
				<div className="flex justify-center pt-6">
					<Button disabled={loadingMore} onClick={onLoadMore} variant="outline">
						{loadingMore ? (
							<LoaderCircleIcon
								className="animate-spin"
								data-icon="inline-start"
							/>
						) : (
							<ChevronDownIcon data-icon="inline-start" />
						)}
						{loadingMore ? "Loading activity" : "Load more activity"}
					</Button>
				</div>
			) : null}
		</>
	);
}

function EmptyActivity({
	hasFilters,
	label,
	icon,
}: {
	hasFilters: boolean;
	label: string;
	icon: ReactNode;
}) {
	return (
		<AdminTableEmpty
			description={
				hasFilters
					? "Try another search or clear the filters."
					: `New ${label} will appear here.`
			}
			icon={icon}
			title={
				hasFilters ? "No activity matches these filters." : "No activity yet."
			}
		/>
	);
}

function walletColumns(): AdminTableColumn<WalletRow>[] {
	return [
		{
			accessorKey: "reference",
			header: "Operation",
			cell: ({ row }) => (
				<div>
					<p className="font-medium">
						{walletTypeLabels[row.original.operation.type] ??
							row.original.operation.type}
					</p>
					<p className="text-xs text-muted-foreground">
						{row.original.operation.publicReference}
					</p>
				</div>
			),
		},
		{
			accessorKey: "player",
			header: "Player",
			cell: ({ row }) => <PlayerCell player={row.original.player} />,
		},
		{
			accessorKey: "amount",
			header: "Movement",
			cell: ({ row }) => (
				<ActivityAmount
					amount={row.original.amountMinor}
					currency={row.original.wallet.currencyCode}
				/>
			),
		},
		{
			accessorKey: "balance",
			header: "Resulting cash",
			cell: ({ row }) => (
				<span className="tabular-nums">
					{formatMoney(
						row.original.wallet.cashBalanceMinor,
						row.original.wallet.currencyCode,
					)}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Time",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{formatDateTime(row.original.operation.createdAt)}
				</span>
			),
		},
	];
}

function gameplayColumns(): AdminTableColumn<GameplayRow>[] {
	return [
		{
			accessorKey: "operation",
			header: "Operation",
			cell: ({ row }) => (
				<div>
					<p className="font-medium capitalize">
						{row.original.operation.type}
					</p>
					<p className="text-xs text-muted-foreground">
						{row.original.operation.externalTransactionId}
					</p>
				</div>
			),
		},
		{
			accessorKey: "player",
			header: "Player",
			cell: ({ row }) => <PlayerCell player={row.original.player} />,
		},
		{
			accessorKey: "game",
			header: "Game / round",
			cell: ({ row }) => (
				<div>
					<p className="max-w-44 truncate font-medium">
						{row.original.game.name ?? row.original.game.gameId}
					</p>
					<p className="max-w-44 truncate text-xs text-muted-foreground">
						{row.original.game.roundReference}
					</p>
				</div>
			),
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => (
				<ActivityAmount
					amount={row.original.operation.amountMinor}
					currency={row.original.wallet.currencyCode}
				/>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Time",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{formatDateTime(row.original.operation.createdAt)}
				</span>
			),
		},
	];
}

function withdrawalColumns(): AdminTableColumn<WithdrawalRow>[] {
	return [
		{
			accessorKey: "player",
			header: "Player",
			cell: ({ row }) => <PlayerCell player={row.original.player} />,
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => (
				<ActivityAmount
					amount={row.original.withdrawal.requestedAmountMinor}
					currency={row.original.withdrawal.currencyCode}
				/>
			),
		},
		{
			accessorKey: "status",
			header: "Decision",
			cell: ({ row }) => (
				<WithdrawalStatus status={row.original.decision.status} />
			),
		},
		{
			accessorKey: "reviewer",
			header: "Reviewer",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{row.original.decision.reviewer?.name ?? "Awaiting review"}
				</span>
			),
		},
		{
			accessorKey: "requestedAt",
			header: "Requested",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{formatDateTime(row.original.withdrawal.requestedAt)}
				</span>
			),
		},
	];
}

function auditColumns(): AdminTableColumn<AuditRow>[] {
	return [
		{
			accessorKey: "action",
			header: "Action",
			cell: ({ row }) => (
				<span className="font-medium">{formatAction(row.original.action)}</span>
			),
		},
		{
			accessorKey: "actor",
			header: "Actor",
			cell: ({ row }) => <PlayerCell player={row.original.actor} />,
		},
		{
			accessorKey: "target",
			header: "Target",
			cell: ({ row }) => (
				<div>
					<p className="capitalize">
						{row.original.targetType.replaceAll("_", " ")}
					</p>
					<p className="max-w-40 truncate text-xs text-muted-foreground">
						{row.original.targetId}
					</p>
				</div>
			),
		},
		{
			accessorKey: "reason",
			header: "Reason",
			cell: ({ row }) => (
				<span className="max-w-64 truncate text-sm text-muted-foreground">
					{row.original.reason}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Time",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{formatDateTime(row.original.createdAt)}
				</span>
			),
		},
	];
}

function WalletMobileRow({ row }: { row: WalletRow }) {
	return (
		<div className="grid gap-3 rounded-xl border border-border p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-medium">
						{walletTypeLabels[row.operation.type] ?? row.operation.type}
					</p>
					<p className="text-xs text-muted-foreground">
						{row.operation.publicReference}
					</p>
				</div>
				<ActivityAmount
					amount={row.amountMinor}
					currency={row.wallet.currencyCode}
				/>
			</div>
			<PlayerCell player={row.player} />
			<div className="flex justify-between border-t border-border pt-3 text-xs">
				<span className="text-muted-foreground">Cash after operation</span>
				<span className="tabular-nums">
					{formatMoney(row.wallet.cashBalanceMinor, row.wallet.currencyCode)}
				</span>
			</div>
			<p className="text-xs text-muted-foreground">
				{formatDateTime(row.operation.createdAt)}
			</p>
		</div>
	);
}

function GameplayMobileRow({ row }: { row: GameplayRow }) {
	return (
		<div className="grid gap-3 rounded-xl border border-border p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-medium capitalize">
						{row.operation.type} · {row.game.name ?? row.game.gameId}
					</p>
					<p className="text-xs text-muted-foreground">
						{row.operation.externalTransactionId}
					</p>
				</div>
				<ActivityAmount
					amount={row.operation.amountMinor}
					currency={row.wallet.currencyCode}
				/>
			</div>
			<PlayerCell player={row.player} />
			<p className="text-xs text-muted-foreground">
				Round {row.game.roundReference} ·{" "}
				{formatDateTime(row.operation.createdAt)}
			</p>
		</div>
	);
}

function WithdrawalMobileRow({ row }: { row: WithdrawalRow }) {
	return (
		<div className="grid gap-3 rounded-xl border border-border p-4">
			<div className="flex items-start justify-between gap-3">
				<PlayerCell player={row.player} />
				<WithdrawalStatus status={row.decision.status} />
			</div>
			<div className="flex justify-between">
				<span className="text-sm text-muted-foreground">Requested</span>
				<ActivityAmount
					amount={row.withdrawal.requestedAmountMinor}
					currency={row.withdrawal.currencyCode}
				/>
			</div>
			<p className="text-xs text-muted-foreground">
				{row.decision.reviewer
					? `Reviewed by ${row.decision.reviewer.name}`
					: "Awaiting review"}{" "}
				· {formatDateTime(row.withdrawal.requestedAt)}
			</p>
		</div>
	);
}

function AuditMobileRow({ row }: { row: AuditRow }) {
	return (
		<div className="grid gap-3 rounded-xl border border-border p-4">
			<div className="flex items-start justify-between gap-3">
				<p className="font-medium">{formatAction(row.action)}</p>
				<p className="text-xs text-muted-foreground">
					{formatDateTime(row.createdAt)}
				</p>
			</div>
			<PlayerCell player={row.actor} />
			<p className="text-sm text-muted-foreground">{row.reason}</p>
			<p className="text-xs text-muted-foreground">
				Target: {row.targetType.replaceAll("_", " ")} · {row.targetId}
			</p>
		</div>
	);
}

function PlayerCell({ player }: { player: { name: string; email: string } }) {
	return (
		<div className="min-w-0">
			<p className="truncate font-medium">{player.name}</p>
			<p className="truncate text-xs text-muted-foreground">{player.email}</p>
		</div>
	);
}

function ActivityAmount({
	amount,
	currency,
}: {
	amount: number;
	currency: string;
}) {
	return (
		<span
			className={`font-medium tabular-nums ${amount < 0 ? "text-destructive" : "text-emerald-400"}`}
		>
			{amount > 0 ? (
				<ArrowDownLeftIcon className="mr-1 inline size-3" />
			) : (
				<ArrowUpRightIcon className="mr-1 inline size-3" />
			)}
			{formatMoney(Math.abs(amount), currency)}
		</span>
	);
}

function WithdrawalStatus({
	status,
}: {
	status: "pending" | "approved" | "rejected";
}) {
	return (
		<Badge
			variant={
				status === "rejected"
					? "destructive"
					: status === "approved"
						? "secondary"
						: "outline"
			}
		>
			{status}
		</Badge>
	);
}

function isActivityTab(value: string): value is AdminActivityTab {
	return value in tabLabels;
}

function formatAction(action: string) {
	return action
		.replaceAll("_", " ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(minor: number, currency: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(minor / 100);
}

function formatDateTime(value: Date | string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}
