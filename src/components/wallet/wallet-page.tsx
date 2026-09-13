"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowDownLeftIcon,
	ArrowRightIcon,
	ArrowUpRightIcon,
	Clock3Icon,
	LandmarkIcon,
	LoaderCircleIcon,
	LockKeyholeIcon,
	PlusIcon,
	WalletCardsIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { walletQueries } from "#/lib/queries/wallet.queries";
import {
	DEMO_TOP_UP_AMOUNTS_MINOR,
	type DemoTopUpInput,
	type WithdrawalRequestInput,
} from "#/lib/schemas/wallet.schema";
import { emitToast } from "#/lib/toast-events";
import { cn } from "#/lib/utils";
import {
	addDemoFunds,
	requestPlayerWithdrawal,
} from "#/server/domains/wallet/wallet.functions";

const transactionLabels: Record<string, string> = {
	welcome_credit: "Welcome credit",
	demo_top_up: "Demo top-up",
	bet: "Bet",
	win: "Win",
	refund: "Refund",
	withdrawal_reserve: "Withdrawal request",
	withdrawal_release: "Withdrawal released",
	withdrawal_debit: "Withdrawal completed",
	bonus_credit: "Bonus credit",
	bonus_conversion: "Bonus converted",
	bonus_forfeit: "Bonus forfeited",
	admin_adjustment: "Balance adjustment",
};

export function WalletPage() {
	const queryClient = useQueryClient();
	const wallet = useQuery(walletQueries.current());
	const [selectedTopUpMinor, setSelectedTopUpMinor] = useState<number>(50_000);
	const [withdrawalAmount, setWithdrawalAmount] = useState("");
	const topUpKey = useRef<string | null>(null);
	const withdrawalKey = useRef<string | null>(null);
	const currencyCode = wallet.data?.currencyCode ?? "USD";
	const money = useMemo(
		() =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: currencyCode,
				minimumFractionDigits: 2,
			}),
		[currencyCode],
	);

	const topUp = useMutation({
		mutationFn: (input: DemoTopUpInput) => addDemoFunds({ data: input }),
		onSuccess: async (_, input) => {
			emitToast({
				title: "Demo funds added",
				description: `${formatMinorUnits(input.amountMinor, money)} added to your wallet.`,
			});
			await queryClient.invalidateQueries({ queryKey: walletQueries.all });
		},
		onSettled: () => {
			topUpKey.current = null;
		},
	});
	const withdrawal = useMutation({
		mutationFn: (input: WithdrawalRequestInput) =>
			requestPlayerWithdrawal({ data: input }),
		onSuccess: async (_, input) => {
			emitToast({
				title: "Withdrawal requested",
				description: `${formatMinorUnits(input.amountMinor, money)} moved to reserved cash.`,
			});
			setWithdrawalAmount("");
			await queryClient.invalidateQueries({ queryKey: walletQueries.all });
		},
		onSettled: () => {
			withdrawalKey.current = null;
		},
	});

	const withdrawalMinor = parseMoneyInput(withdrawalAmount);
	const withdrawalError = useMemo(() => {
		if (!withdrawalAmount) return null;
		if (withdrawalMinor === null || withdrawalMinor <= 0)
			return "Enter a valid amount greater than 0 with no more than two decimal places.";
		if (wallet.data && withdrawalMinor > wallet.data.balances.cashBalanceMinor)
			return "This amount is more than your cash balance.";
		return null;
	}, [wallet.data, withdrawalAmount, withdrawalMinor]);

	function submitTopUp() {
		if (topUpKey.current || topUp.isPending) return;
		topUpKey.current = crypto.randomUUID();
		topUp.mutate({
			amountMinor: selectedTopUpMinor,
			idempotencyKey: topUpKey.current,
		});
	}
	function submitWithdrawal() {
		if (
			withdrawalKey.current ||
			withdrawal.isPending ||
			withdrawalError ||
			withdrawalMinor === null
		)
			return;
		withdrawalKey.current = crypto.randomUUID();
		withdrawal.mutate({
			amountMinor: withdrawalMinor,
			idempotencyKey: withdrawalKey.current,
		});
	}

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<header className="mb-7 flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
					<Badge variant="secondary">{currencyCode}</Badge>
					<Badge variant="outline">Virtual funds</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Add play money, review your balances, and manage demo withdrawals.
				</p>
			</header>
			{wallet.isPending ? (
				<WalletPageSkeleton />
			) : wallet.isError ? (
				<WalletReadError
					error={wallet.error}
					isRetrying={wallet.isFetching}
					onRetry={() => wallet.refetch()}
				/>
			) : wallet.data ? (
				<>
					<section aria-labelledby="balance-heading" className="mb-6">
						<h2 id="balance-heading" className="sr-only">
							Wallet balances
						</h2>
						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							<BalanceCard
								label="Playable balance"
								valueMinor={wallet.data.playableBalanceMinor}
								money={money}
								icon={WalletCardsIcon}
								emphasized
							/>
							<BalanceCard
								label="Cash balance"
								valueMinor={wallet.data.balances.cashBalanceMinor}
								money={money}
								icon={LandmarkIcon}
							/>
							<BalanceCard
								label="Bonus balance"
								valueMinor={wallet.data.balances.bonusBalanceMinor}
								money={money}
								icon={PlusIcon}
							/>
							<BalanceCard
								label="Reserved cash"
								valueMinor={wallet.data.balances.reservedCashMinor}
								money={money}
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
									{DEMO_TOP_UP_AMOUNTS_MINOR.map((amountMinor) => (
										<button
											type="button"
											key={amountMinor}
											onClick={() => setSelectedTopUpMinor(amountMinor)}
											disabled={topUp.isPending}
											className={cn(
												"rounded-2xl border px-3 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
												selectedTopUpMinor === amountMinor
													? "border-primary bg-primary/10 text-foreground"
													: "border-border bg-background text-muted-foreground hover:bg-muted",
											)}
											aria-pressed={selectedTopUpMinor === amountMinor}
										>
											<span className="block text-base font-semibold text-foreground">
												{formatMinorUnits(amountMinor, money)}
											</span>
											<span className="mt-1 block text-xs">Demo credit</span>
										</button>
									))}
								</div>
								{topUp.isError ? (
									<p className="mt-3 text-sm text-destructive" role="alert">
										{walletErrorMessage(
											topUp.error,
											"The demo funds could not be added.",
										)}
									</p>
								) : null}
							</CardContent>
							<CardFooter>
								<Button
									size="lg"
									className="w-full sm:w-auto"
									onClick={submitTopUp}
									disabled={topUp.isPending}
								>
									{topUp.isPending ? (
										<LoaderCircleIcon className="animate-spin" />
									) : (
										<PlusIcon data-icon="inline-start" />
									)}
									{topUp.isPending
										? "Adding funds..."
										: `Add ${formatMinorUnits(selectedTopUpMinor, money)}`}
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
											{currencySymbol(currencyCode)}
										</span>
										<Input
											id="withdrawal-amount"
											inputMode="decimal"
											placeholder="0.00"
											value={withdrawalAmount}
											onChange={(event) =>
												setWithdrawalAmount(event.target.value)
											}
											disabled={withdrawal.isPending}
											className="pl-7"
											aria-invalid={Boolean(
												withdrawalError || withdrawal.isError,
											)}
											aria-describedby={
												withdrawalError || withdrawal.isError
													? "withdrawal-error"
													: "withdrawal-help"
											}
										/>
									</div>
									{withdrawalError || withdrawal.isError ? (
										<p
											id="withdrawal-error"
											className="text-xs text-destructive"
											role="alert"
										>
											{withdrawalError ??
												walletErrorMessage(
													withdrawal.error,
													"The withdrawal could not be requested.",
												)}
										</p>
									) : (
										<p
											id="withdrawal-help"
											className="text-xs text-muted-foreground"
										>
											Available:{" "}
											{formatMinorUnits(
												wallet.data.balances.cashBalanceMinor,
												money,
											)}
										</p>
									)}
								</div>
								<Separator />
								<div className="flex items-start gap-2 text-xs text-muted-foreground">
									<Clock3Icon className="mt-0.5 size-3.5 shrink-0" />
									<span>
										Demo requests remain pending. No payment method or real
										transfer is involved.
									</span>
								</div>
								{wallet.data.pendingWithdrawals.length ? (
									<div className="rounded-xl bg-muted/50 p-3">
										<p className="text-xs font-medium">Pending reservations</p>
										{wallet.data.pendingWithdrawals.slice(0, 3).map((item) => (
											<div
												key={item.id}
												className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"
											>
												<span>{formatDateTime(item.requestedAt)}</span>
												<span className="font-medium text-foreground tabular-nums">
													{formatMinorUnits(item.reservedAmountMinor, money)}
												</span>
											</div>
										))}
									</div>
								) : null}
							</CardContent>
							<CardFooter>
								<Button
									variant="outline"
									size="lg"
									className="w-full"
									disabled={
										!withdrawalAmount ||
										Boolean(withdrawalError) ||
										withdrawal.isPending
									}
									onClick={submitWithdrawal}
								>
									{withdrawal.isPending ? (
										<LoaderCircleIcon className="animate-spin" />
									) : null}
									{withdrawal.isPending
										? "Requesting..."
										: "Request demo withdrawal"}
								</Button>
							</CardFooter>
						</Card>

						<Card className="overflow-hidden pb-0 lg:col-span-5">
							<CardHeader>
								<CardTitle>Recent activity</CardTitle>
								<CardDescription>
									Your latest wallet transactions.
								</CardDescription>
								<CardAction>
									<Button
										render={<Link to="/history" />}
										variant="ghost"
										size="sm"
									>
										View all <ArrowRightIcon data-icon="inline-end" />
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
										{wallet.data.recentActivity.length === 0 ? (
											<TableRow className="hover:bg-transparent">
												<TableCell
													colSpan={4}
													className="h-28 text-center text-muted-foreground"
												>
													No wallet activity yet.
												</TableCell>
											</TableRow>
										) : null}
										{wallet.data.recentActivity.map((item) => {
											const isCredit = item.amountMinor > 0;
											const isPending = item.sourceId
												? wallet.data.pendingWithdrawals.some(
														(pending) => pending.id === item.sourceId,
													)
												: false;
											const Icon = isCredit
												? ArrowDownLeftIcon
												: ArrowUpRightIcon;
											return (
												<TableRow key={item.id}>
													<TableCell className="pl-5">
														<div className="flex items-center gap-3">
															<Icon
																className={cn(
																	"size-4 shrink-0",
																	isCredit
																		? "text-emerald-600 dark:text-emerald-400"
																		: "text-muted-foreground",
																)}
															/>
															<div>
																<p className="font-medium">
																	{transactionLabels[item.type] ?? item.type}
																</p>
																<p className="text-xs text-muted-foreground">
																	{item.bucket.replace("_", " ")}
																</p>
															</div>
														</div>
													</TableCell>
													<TableCell className="text-muted-foreground">
														{formatDateTime(item.createdAt)}
													</TableCell>
													<TableCell>
														<Badge
															variant={isPending ? "outline" : "secondary"}
														>
															{isPending ? "Pending" : "Completed"}
														</Badge>
													</TableCell>
													<TableCell
														className={cn(
															"pr-5 text-right font-medium tabular-nums",
															isCredit &&
																"text-emerald-600 dark:text-emerald-400",
														)}
													>
														{isCredit ? "+" : "-"}
														{formatMinorUnits(
															Math.abs(item.amountMinor),
															money,
														)}
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
				</>
			) : null}
		</main>
	);
}

function BalanceCard({
	label,
	valueMinor,
	money,
	icon: Icon,
	emphasized = false,
}: {
	label: string;
	valueMinor: number;
	money: Intl.NumberFormat;
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
					{formatMinorUnits(valueMinor, money)}
				</p>
			</CardContent>
		</Card>
	);
}

function WalletPageSkeleton() {
	return (
		<output aria-label="Loading wallet" className="space-y-6">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{[1, 2, 3, 4].map((key) => (
					<Skeleton key={key} className="h-28" />
				))}
			</div>
			<div className="grid gap-6 lg:grid-cols-5">
				<Skeleton className="h-64 lg:col-span-3" />
				<Skeleton className="h-64 lg:col-span-2" />
				<Skeleton className="h-72 lg:col-span-5" />
			</div>
		</output>
	);
}

function WalletReadError({
	error,
	isRetrying,
	onRetry,
}: {
	error: unknown;
	isRetrying: boolean;
	onRetry: () => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Your wallet could not be loaded</CardTitle>
				<CardDescription>
					{walletErrorMessage(error, "Please try again.")}
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<Button onClick={onRetry} disabled={isRetrying}>
					{isRetrying ? <LoaderCircleIcon className="animate-spin" /> : null}
					{isRetrying ? "Retrying..." : "Try again"}
				</Button>
			</CardFooter>
		</Card>
	);
}

function parseMoneyInput(value: string) {
	if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return null;
	const [whole = "0", fraction = ""] = value.split(".");
	const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
	return Number.isSafeInteger(minor) ? minor : null;
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
function currencySymbol(currencyCode: string) {
	return (
		new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currencyCode,
			currencyDisplay: "narrowSymbol",
		})
			.formatToParts(0)
			.find((part) => part.type === "currency")?.value ?? currencyCode
	);
}
function walletErrorMessage(error: unknown, fallback: string) {
	if (!(error instanceof Error)) return fallback;
	if (error.message === "Unauthorized")
		return "Your session has expired. Sign in again to continue.";
	if (error.message === "Forbidden")
		return "This account cannot access wallet features.";
	if (error.message.toLowerCase().includes("insufficient"))
		return "Your cash balance is too low for this request.";
	if (error.message.includes("Idempotency"))
		return "This request was already used for another wallet action.";
	return error.message || fallback;
}
