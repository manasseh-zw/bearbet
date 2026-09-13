"use client";

import { Link } from "@tanstack/react-router";
import {
	ArrowDownLeftIcon,
	ArrowRightIcon,
	ArrowUpRightIcon,
	Clock3Icon,
	LandmarkIcon,
	LockKeyholeIcon,
	PlusIcon,
	ShieldCheckIcon,
	WalletCardsIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";

const TOP_UP_AMOUNTS = [100, 500, 1_000, 10_000] as const;

type Activity = {
	id: string;
	type: "Welcome credit" | "Demo top-up" | "Withdrawal";
	date: string;
	amount: number;
	status: "Completed" | "Pending";
};

const STARTING_ACTIVITY: Activity[] = [
	{
		id: "TXN-10001",
		type: "Welcome credit",
		date: "Today, 09:42",
		amount: 1_000,
		status: "Completed",
	},
];

const money = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
});

export function WalletPage() {
	const [cash, setCash] = useState(1_000);
	const [reserved, setReserved] = useState(0);
	const [selectedTopUp, setSelectedTopUp] = useState<number>(500);
	const [withdrawalAmount, setWithdrawalAmount] = useState("");
	const [activity, setActivity] = useState<Activity[]>(STARTING_ACTIVITY);
	const [notice, setNotice] = useState<string | null>(null);

	const withdrawal = Number(withdrawalAmount);
	const withdrawalError = useMemo(() => {
		if (!withdrawalAmount) return null;
		if (!Number.isFinite(withdrawal) || withdrawal <= 0) {
			return "Enter an amount greater than $0.";
		}
		if (withdrawal > cash) return "This amount is more than your cash balance.";
		return null;
	}, [cash, withdrawal, withdrawalAmount]);

	function addDemoFunds() {
		setCash((current) => current + selectedTopUp);
		setActivity((current) => [
			{
				id: `TXN-${10001 + current.length}`,
				type: "Demo top-up",
				date: "Just now",
				amount: selectedTopUp,
				status: "Completed",
			},
			...current,
		]);
		setNotice(`${money.format(selectedTopUp)} added to your demo wallet.`);
	}

	function requestWithdrawal() {
		if (withdrawalError || !withdrawalAmount) return;

		setCash((current) => current - withdrawal);
		setReserved((current) => current + withdrawal);
		setActivity((current) => [
			{
				id: `TXN-${10001 + current.length}`,
				type: "Withdrawal",
				date: "Just now",
				amount: -withdrawal,
				status: "Pending",
			},
			...current,
		]);
		setWithdrawalAmount("");
		setNotice(`${money.format(withdrawal)} moved to reserved cash.`);
	}

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<header className="mb-7 flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
					<Badge variant="secondary">USD</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Add play money, review your balances, and manage demo withdrawals.
				</p>
			</header>

			<div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
				<ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
				<div>
					<p className="font-medium">Virtual funds only</p>
					<p className="mt-0.5 text-muted-foreground">
						This wallet is for demo play. Funds have no cash value. Actions on
						this preview reset when you refresh.
					</p>
				</div>
			</div>

			{notice ? (
				<output className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
					<span>{notice}</span>
					<Button variant="ghost" size="xs" onClick={() => setNotice(null)}>
						Dismiss
					</Button>
				</output>
			) : null}

			<section aria-labelledby="balance-heading" className="mb-6">
				<h2 id="balance-heading" className="sr-only">
					Wallet balances
				</h2>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<BalanceCard
						label="Playable balance"
						value={cash}
						icon={WalletCardsIcon}
						emphasized
					/>
					<BalanceCard label="Cash balance" value={cash} icon={LandmarkIcon} />
					<BalanceCard label="Bonus balance" value={0} icon={PlusIcon} />
					<BalanceCard
						label="Reserved cash"
						value={reserved}
						icon={LockKeyholeIcon}
					/>
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-5">
				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle>Add virtual funds</CardTitle>
						<CardDescription>
							Choose a demo amount to add to your cash balance.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{TOP_UP_AMOUNTS.map((amount) => (
								<button
									type="button"
									key={amount}
									onClick={() => setSelectedTopUp(amount)}
									className={cn(
										"rounded-2xl border px-3 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
										selectedTopUp === amount
											? "border-primary bg-primary/10 text-foreground"
											: "border-border bg-background text-muted-foreground hover:bg-muted",
									)}
									aria-pressed={selectedTopUp === amount}
								>
									<span className="block text-base font-semibold text-foreground">
										{money.format(amount)}
									</span>
									<span className="mt-1 block text-xs">Demo credit</span>
								</button>
							))}
						</div>
					</CardContent>
					<CardFooter>
						<Button
							size="lg"
							className="w-full sm:w-auto"
							onClick={addDemoFunds}
						>
							<PlusIcon data-icon="inline-start" />
							Add {money.format(selectedTopUp)}
						</Button>
					</CardFooter>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Request withdrawal</CardTitle>
						<CardDescription>
							Move available cash into a pending reservation.
						</CardDescription>
						<CardAction>
							<Badge variant="outline">Demo</Badge>
						</CardAction>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="withdrawal-amount">Amount</Label>
							<div className="relative">
								<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
									$
								</span>
								<Input
									id="withdrawal-amount"
									type="number"
									min="0.01"
									step="0.01"
									placeholder="0.00"
									value={withdrawalAmount}
									onChange={(event) => setWithdrawalAmount(event.target.value)}
									className="pl-7"
									aria-invalid={Boolean(withdrawalError)}
									aria-describedby={
										withdrawalError ? "withdrawal-error" : "withdrawal-help"
									}
								/>
							</div>
							{withdrawalError ? (
								<p
									id="withdrawal-error"
									className="text-xs text-destructive"
									role="alert"
								>
									{withdrawalError}
								</p>
							) : (
								<p
									id="withdrawal-help"
									className="text-xs text-muted-foreground"
								>
									Available: {money.format(cash)}
								</p>
							)}
						</div>
						<Separator />
						<div className="flex items-start gap-2 text-xs text-muted-foreground">
							<Clock3Icon className="mt-0.5 size-3.5 shrink-0" />
							<span>
								Demo requests remain pending. No payment method or real transfer
								is involved.
							</span>
						</div>
					</CardContent>
					<CardFooter>
						<Button
							variant="outline"
							size="lg"
							className="w-full"
							disabled={!withdrawalAmount || Boolean(withdrawalError)}
							onClick={requestWithdrawal}
						>
							Request demo withdrawal
						</Button>
					</CardFooter>
				</Card>

				<Card className="overflow-hidden pb-0 lg:col-span-5">
					<CardHeader>
						<CardTitle>Recent activity</CardTitle>
						<CardDescription>Your latest wallet transactions.</CardDescription>
						<CardAction>
							<Button asChild variant="ghost" size="sm">
								<Link to="/history">
									View all <ArrowRightIcon data-icon="inline-end" />
								</Link>
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="pl-5">Transaction</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="pr-5 text-right">Amount</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{activity.length === 0 ? (
									<TableRow className="hover:bg-transparent">
										<TableCell
											colSpan={4}
											className="h-28 text-center text-muted-foreground"
										>
											No wallet activity yet.
										</TableCell>
									</TableRow>
								) : null}
								{activity.slice(0, 5).map((item) => {
									const isCredit = item.amount > 0;
									const Icon = isCredit ? ArrowDownLeftIcon : ArrowUpRightIcon;
									return (
										<TableRow key={item.id}>
											<TableCell className="pl-5">
												<div className="flex items-center gap-3">
													<span
														className={cn(
															"grid size-8 place-items-center rounded-xl",
															isCredit
																? "bg-primary/10 text-primary"
																: "bg-muted text-muted-foreground",
														)}
													>
														<Icon className="size-4" />
													</span>
													<div>
														<p className="font-medium">{item.type}</p>
														<p className="text-xs text-muted-foreground">
															{item.id}
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{item.date}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														item.status === "Completed"
															? "secondary"
															: "outline"
													}
												>
													{item.status}
												</Badge>
											</TableCell>
											<TableCell
												className={cn(
													"pr-5 text-right font-medium tabular-nums",
													isCredit && "text-primary",
												)}
											>
												{isCredit ? "+" : "-"}
												{money.format(Math.abs(item.amount))}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
					<CardFooter className="border-t py-4 text-xs text-muted-foreground sm:hidden">
						Swipe the table to see every column.
					</CardFooter>
				</Card>
			</div>
		</main>
	);
}

function BalanceCard({
	label,
	value,
	icon: Icon,
	emphasized = false,
}: {
	label: string;
	value: number;
	icon: typeof WalletCardsIcon;
	emphasized?: boolean;
}) {
	return (
		<Card
			className={cn(
				"gap-3",
				emphasized && "bg-primary text-primary-foreground ring-primary/20",
			)}
		>
			<CardHeader className="grid grid-cols-[1fr_auto] items-center">
				<CardDescription
					className={cn(emphasized && "text-primary-foreground/70")}
				>
					{label}
				</CardDescription>
				<span
					className={cn(
						"grid size-8 place-items-center rounded-xl bg-muted text-muted-foreground",
						emphasized && "bg-primary-foreground/10 text-primary-foreground",
					)}
				>
					<Icon className="size-4" />
				</span>
			</CardHeader>
			<CardContent>
				<p className="text-2xl font-semibold tracking-tight tabular-nums">
					{money.format(value)}
				</p>
			</CardContent>
		</Card>
	);
}
