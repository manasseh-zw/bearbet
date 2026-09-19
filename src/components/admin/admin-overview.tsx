import { Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	ArrowRightIcon,
	CircleCheckIcon,
	Clock3Icon,
	DicesIcon,
	UsersIcon,
	WalletCardsIcon,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

const operations = [
	{ day: "Mon", rounds: 182, wallet: 64 },
	{ day: "Tue", rounds: 214, wallet: 73 },
	{ day: "Wed", rounds: 196, wallet: 58 },
	{ day: "Thu", rounds: 248, wallet: 82 },
	{ day: "Fri", rounds: 272, wallet: 91 },
	{ day: "Sat", rounds: 231, wallet: 76 },
	{ day: "Sun", rounds: 304, wallet: 105 },
];

const chartConfig = {
	rounds: { label: "Game rounds", color: "var(--chart-2)" },
	wallet: { label: "Wallet operations", color: "var(--primary)" },
} satisfies ChartConfig;

const stats = [
	{
		label: "Registered players",
		value: "128",
		note: "Demo snapshot",
		icon: UsersIcon,
	},
	{
		label: "Enabled games",
		value: "64",
		note: "3 unavailable",
		icon: DicesIcon,
	},
	{
		label: "Pending withdrawals",
		value: "7",
		note: "Needs review",
		icon: WalletCardsIcon,
		urgent: true,
	},
	{
		label: "Active bonuses",
		value: "5",
		note: "2 promotional",
		icon: ActivityIcon,
	},
];

const activity = [
	{
		label: "Withdrawal requested",
		subject: "Maya N. · $120.00",
		time: "8 min ago",
		state: "Pending",
		tone: "warning",
	},
	{
		label: "Demo funds added",
		subject: "Jordan K. · $500.00",
		time: "24 min ago",
		state: "Completed",
		tone: "success",
	},
	{
		label: "Lucky Number settled",
		subject: "Sam R. · Won $42.00",
		time: "41 min ago",
		state: "Completed",
		tone: "success",
	},
	{
		label: "Bonus activated",
		subject: "Welcome Bear Hug",
		time: "1 hr ago",
		state: "Active",
		tone: "neutral",
	},
];

export function AdminOverview() {
	return (
		<main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
			<div className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Good evening, operator
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						A quick view of the virtual casino and the work waiting for review.
					</p>
				</div>
				<Badge className="w-fit gap-1.5" variant="outline">
					<CircleCheckIcon />
					Demo environment
				</Badge>
			</div>

			<section
				aria-label="Operational summary"
				className="grid gap-3 py-6 sm:grid-cols-2 xl:grid-cols-4"
			>
				{stats.map(({ icon: Icon, label, note, value, urgent }) => (
					<Card className="shadow-none" key={label}>
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
				))}
			</section>

			<section className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
				<Card className="shadow-none">
					<CardHeader className="gap-1 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<CardTitle>Operations this week</CardTitle>
							<CardDescription>
								Illustrative data until live admin queries are connected.
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
								data={operations}
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
									content={<ChartTooltipContent />}
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
									dataKey="wallet"
									fill="none"
									stroke="var(--color-wallet)"
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
						<CardTitle>Needs attention</CardTitle>
						<CardDescription>Items that may need an operator.</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						<AttentionRow
							icon={Clock3Icon}
							label="Withdrawals"
							detail="7 pending requests"
							to="/admin/withdrawals"
						/>
						<AttentionRow
							icon={DicesIcon}
							label="Catalogue"
							detail="3 games unavailable"
							to="/admin/games"
						/>
						<AttentionRow
							icon={UsersIcon}
							label="Accounts"
							detail="2 players suspended"
							to="/admin/users"
						/>
					</CardContent>
				</Card>
			</section>

			<Card className="mt-4 shadow-none">
				<CardHeader className="flex-row items-center justify-between gap-3">
					<div>
						<CardTitle>Recent activity</CardTitle>
						<CardDescription>
							Latest virtual-money and gameplay events.
						</CardDescription>
					</div>
					<Button
						render={<Link to="/admin/activity" />}
						size="sm"
						variant="ghost"
					>
						View activity
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
				</CardHeader>
				<CardContent className="grid gap-1 px-3 pb-3 sm:px-5 sm:pb-5">
					{activity.map((item) => (
						<div
							className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-muted/50"
							key={`${item.label}-${item.subject}`}
						>
							<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
								<ActivityIcon />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{item.label}</p>
								<p className="truncate text-xs text-muted-foreground">
									{item.subject}
								</p>
							</div>
							<div className="flex shrink-0 flex-col items-end gap-1">
								<Badge
									variant={item.tone === "warning" ? "outline" : "secondary"}
								>
									{item.state}
								</Badge>
								<span className="text-xs text-muted-foreground">
									{item.time}
								</span>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</main>
	);
}

function AttentionRow({
	detail,
	icon: Icon,
	label,
	to,
}: {
	detail: string;
	icon: typeof Clock3Icon;
	label: string;
	to: "/admin/withdrawals" | "/admin/games" | "/admin/users";
}) {
	return (
		<Link
			className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50"
			to={to}
		>
			<span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
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
