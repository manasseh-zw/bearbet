import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	ArrowRightIcon,
	BadgePercentIcon,
	CircleCheckIcon,
	Clock3Icon,
	DicesIcon,
	UsersIcon,
	WalletCardsIcon,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	AdminTableEmpty,
	AdminTableError,
	AdminTableLoading,
} from "#/components/admin/data-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import type { AdminOverviewData } from "#/lib/queries/admin-overview.queries";
import { adminOverviewQueries } from "#/lib/queries/admin-overview.queries";

const chartConfig = {
	rounds: { label: "Game rounds", color: "var(--chart-2)" },
	walletOperations: { label: "Wallet operations", color: "var(--primary)" },
} satisfies ChartConfig;

const walletEventLabels: Record<string, string> = {
	admin_adjustment: "Admin adjustment",
	bonus_conversion: "Bonus converted",
	bonus_credit: "Bonus credit",
	bonus_forfeit: "Bonus forfeited",
	demo_top_up: "Demo top-up",
	provider_reconciliation: "Provider reconciliation",
	welcome_credit: "Welcome credit",
	withdrawal_debit: "Withdrawal completed",
	withdrawal_release: "Withdrawal released",
	withdrawal_reserve: "Withdrawal reserved",
};

export function AdminOverview() {
	const overviewQuery = useQuery(adminOverviewQueries.summary());

	return (
		<main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
			<header className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Operations overview
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						A live view of the virtual casino and the work waiting for review.
					</p>
				</div>
				<Badge className="w-fit gap-1.5" variant="outline">
					<CircleCheckIcon />
					Live operational data
				</Badge>
			</header>

			{overviewQuery.isError ? (
				<section className="pt-6">
					<AdminTableError
						onRetry={() => void overviewQuery.refetch()}
						title="The overview could not be loaded."
					/>
				</section>
			) : overviewQuery.isPending ? (
				<OverviewLoading />
			) : overviewQuery.data ? (
				<OverviewContent data={overviewQuery.data} />
			) : null}
		</main>
	);
}

function OverviewContent({ data }: { data: AdminOverviewData }) {
	const { stats } = data;
	const attention = [
		{
			icon: Clock3Icon,
			label: "Withdrawals",
			detail:
				stats.pendingWithdrawals > 0
					? `${stats.pendingWithdrawals} pending requests · ${formatMoney(stats.pendingWithdrawalAmountMinor)}`
					: "No pending requests",
			to: "/admin/withdrawals" as const,
			urgent: stats.pendingWithdrawals > 0,
		},
		{
			icon: DicesIcon,
			label: "Catalogue",
			detail:
				stats.unavailableGames > 0
					? `${stats.unavailableGames} games unavailable`
					: "All catalogue games available",
			to: "/admin/games" as const,
			urgent: stats.unavailableGames > 0,
		},
		{
			icon: UsersIcon,
			label: "Accounts",
			detail:
				stats.suspendedPlayers > 0
					? `${stats.suspendedPlayers} players suspended`
					: "No suspended players",
			to: "/admin/users" as const,
			urgent: stats.suspendedPlayers > 0,
		},
	];
	const attentionCount = attention.filter((item) => item.urgent).length;

	return (
		<>
			<section
				aria-label="Operational summary"
				className="grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-4"
			>
				<OverviewStat
					icon={UsersIcon}
					label="Registered players"
					note={`${stats.activePlayers} active · ${stats.suspendedPlayers} suspended`}
					value={stats.registeredPlayers}
				/>
				<OverviewStat
					icon={DicesIcon}
					label="Enabled games"
					note={`${stats.unavailableGames} unavailable · ${stats.totalGames} in catalogue`}
					value={stats.enabledGames}
				/>
				<OverviewStat
					icon={WalletCardsIcon}
					label="Pending withdrawals"
					note={
						stats.pendingWithdrawals > 0
							? `${formatMoney(stats.pendingWithdrawalAmountMinor)} awaiting review`
							: "Nothing waiting for review"
					}
					urgent={stats.pendingWithdrawals > 0}
					value={stats.pendingWithdrawals}
				/>
				<OverviewStat
					icon={BadgePercentIcon}
					label="Active bonuses"
					note={`${stats.promotionalBonusDefinitions} promotional · ${stats.activeBonusAwards} player awards`}
					value={stats.activeBonusDefinitions}
				/>
			</section>

			<section className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
				<Card className="shadow-none">
					<CardHeader className="gap-1 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<CardTitle>Operations, last 7 days</CardTitle>
							<CardDescription>
								Recorded game rounds and wallet operations from the live
								database.
							</CardDescription>
						</div>
						<Badge variant="secondary">7 days</Badge>
					</CardHeader>
					<CardContent>
						<ChartContainer
							className="aspect-[16/7] w-full"
							config={chartConfig}
						>
							<AreaChart
								accessibilityLayer
								data={data.operations}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<defs>
									<linearGradient
										id="admin-rounds-fill"
										x1="0"
										x2="0"
										y1="0"
										y2="1"
									>
										<stop
											offset="0%"
											stopColor="var(--color-rounds)"
											stopOpacity={0.32}
										/>
										<stop
											offset="100%"
											stopColor="var(--color-rounds)"
											stopOpacity={0}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid className="stroke-border" vertical={false} />
								<XAxis
									axisLine={false}
									dataKey="day"
									tickFormatter={formatDayLabel}
									tickLine={false}
									tickMargin={8}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tickMargin={8}
									width={32}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(label) => formatDayLabel(String(label))}
										/>
									}
									cursor={false}
								/>
								<Area
									dataKey="rounds"
									fill="url(#admin-rounds-fill)"
									fillOpacity={1}
									stroke="var(--color-rounds)"
									strokeWidth={2}
									type="monotone"
								/>
								<Area
									dataKey="walletOperations"
									fill="none"
									stroke="var(--color-walletOperations)"
									strokeDasharray="4 4"
									strokeWidth={2}
									type="monotone"
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>
							{attentionCount > 0 ? "Needs attention" : "No action needed"}
						</CardTitle>
						<CardDescription>
							{attentionCount > 0
								? "Current checks that may need an operator."
								: "The current operational checks are clear."}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						{attention.map((item) => (
							<AttentionRow key={item.label} {...item} />
						))}
					</CardContent>
				</Card>
			</section>

			<RecentActivity events={data.recentActivity} />
		</>
	);
}

function OverviewStat({
	icon: Icon,
	label,
	note,
	urgent = false,
	value,
}: {
	icon: typeof UsersIcon;
	label: string;
	note: string;
	urgent?: boolean;
	value: number;
}) {
	return (
		<Card className="shadow-none">
			<CardHeader className="flex-row items-center justify-between gap-3 pb-2">
				<CardTitle className="font-normal text-muted-foreground text-xs">
					{label}
				</CardTitle>
				<Icon
					className={urgent ? "text-primary" : "text-muted-foreground/70"}
				/>
			</CardHeader>
			<CardContent>
				<p className="text-2xl font-semibold tabular-nums">{value}</p>
				<p
					className={
						urgent
							? "mt-2 text-xs text-primary"
							: "mt-2 text-xs text-muted-foreground"
					}
				>
					{note}
				</p>
			</CardContent>
		</Card>
	);
}

function RecentActivity({
	events,
}: {
	events: AdminOverviewData["recentActivity"];
}) {
	return (
		<Card className="mt-4 shadow-none">
			<CardHeader className="flex-row items-center justify-between gap-3">
				<div>
					<CardTitle>Recent activity</CardTitle>
					<CardDescription>
						Latest wallet, gameplay, withdrawal, and bonus events.
					</CardDescription>
				</div>
				<Button
					nativeButton={false}
					render={
						<Link
							search={{
								tab: "wallet",
								search: "",
								types: [],
								withdrawalStatus: "all",
								withdrawalStatuses: [],
								limit: 25,
							}}
							to="/admin/activity"
						/>
					}
					size="sm"
					variant="ghost"
				>
					View activity
					<ArrowRightIcon data-icon="inline-end" />
				</Button>
			</CardHeader>
			<CardContent className="grid gap-1 px-3 pb-3 sm:px-5 sm:pb-5">
				{events.length ? (
					events.map((event) => (
						<ActivityRow event={event} key={`${event.kind}-${event.id}`} />
					))
				) : (
					<AdminTableEmpty
						description="Wallet movements, gameplay, withdrawal requests, and bonus awards will appear here."
						icon={<ActivityIcon />}
						title="No activity yet"
					/>
				)}
			</CardContent>
		</Card>
	);
}

function ActivityRow({
	event,
}: {
	event: AdminOverviewData["recentActivity"][number];
}) {
	const state = activityState(event);
	return (
		<div className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-muted/50">
			<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
				<ActivityIcon />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{activityLabel(event)}</p>
				<p className="truncate text-xs text-muted-foreground">
					{activityDetail(event)}
				</p>
			</div>
			{event.amountMinor !== 0 && event.currencyCode ? (
				<span className="hidden shrink-0 text-sm tabular-nums sm:block">
					{formatMoney(Math.abs(event.amountMinor), event.currencyCode)}
				</span>
			) : null}
			<div className="flex shrink-0 flex-col items-end gap-1">
				<Badge variant={state.warning ? "outline" : "secondary"}>
					{state.label}
				</Badge>
				<span className="text-xs text-muted-foreground">
					{formatRelativeTime(event.createdAt)}
				</span>
			</div>
		</div>
	);
}

function AttentionRow({
	detail,
	icon: Icon,
	label,
	to,
	urgent,
}: {
	detail: string;
	icon: typeof Clock3Icon;
	label: string;
	to: "/admin/withdrawals" | "/admin/games" | "/admin/users";
	urgent: boolean;
}) {
	return (
		<Link
			className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50"
			to={to}
		>
			<span
				className={
					urgent
						? "grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"
						: "grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"
				}
			>
				<Icon />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-sm font-medium">{label}</span>
				<span className="block text-xs text-muted-foreground">{detail}</span>
			</span>
			<ArrowRightIcon className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
		</Link>
	);
}

function OverviewLoading() {
	return (
		<output
			aria-busy="true"
			aria-label="Loading overview"
			className="grid gap-4 pt-6"
		>
			<AdminTableLoading rowCount={4} />
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
				<AdminTableLoading rowCount={5} />
				<AdminTableLoading rowCount={4} />
			</div>
			<AdminTableLoading rowCount={5} />
		</output>
	);
}

function activityLabel(event: AdminOverviewData["recentActivity"][number]) {
	if (event.kind === "wallet") {
		return walletEventLabels[event.eventType] ?? event.eventType;
	}
	if (event.kind === "gameplay") {
		return `${event.eventType.slice(0, 1).toUpperCase()}${event.eventType.slice(1)}`;
	}
	if (event.kind === "withdrawal") return "Withdrawal requested";
	return "Bonus awarded";
}

function activityDetail(event: AdminOverviewData["recentActivity"][number]) {
	if (event.kind === "gameplay" && event.context) {
		return `${event.subject} · ${event.context}`;
	}
	if (event.kind === "bonus" && event.context) {
		return `${event.context} · ${event.subject}`;
	}
	return event.subject;
}

function activityState(event: AdminOverviewData["recentActivity"][number]) {
	if (event.kind === "wallet") return { label: "Recorded", warning: false };
	const label = event.status
		? `${event.status.slice(0, 1).toUpperCase()}${event.status.slice(1).replaceAll("_", " ")}`
		: "Recorded";
	return { label, warning: event.status === "pending" };
}

function formatMoney(minor: number, currency = "USD") {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(minor / 100);
}

function formatRelativeTime(value: Date | string) {
	const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
	const minutes = Math.floor(elapsed / 60_000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}

function formatDayLabel(day: string) {
	return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
		new Date(`${day}T12:00:00`),
	);
}
