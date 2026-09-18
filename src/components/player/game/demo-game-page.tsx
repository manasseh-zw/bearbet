"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	CircleDollarSignIcon,
	LoaderCircleIcon,
	RotateCcwIcon,
	SparklesIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { emitBonusCompletion } from "#/lib/bonus-events";
import { bonusQueries } from "#/lib/queries/bonus.queries";
import { historyQueries } from "#/lib/queries/history.queries";
import { walletQueries } from "#/lib/queries/wallet.queries";
import { cn } from "#/lib/utils";
import {
	closeCurrentPlayerGame,
	playCurrentPlayerDemoGame,
	startCurrentPlayerGame,
} from "#/server/domains/gameplay/gameplay.functions";

type DemoGamePageProps = { gameId: string };

export function DemoGamePage({ gameId }: DemoGamePageProps) {
	const queryClient = useQueryClient();
	const launchKey = useRef(crypto.randomUUID());
	const roundKey = useRef<string | null>(null);
	const [stake, setStake] = useState("10.00");
	const [summary, setSummary] = useState<Awaited<
		ReturnType<typeof closeCurrentPlayerGame>
	> | null>(null);

	const start = useMutation({
		mutationFn: () =>
			startCurrentPlayerGame({
				data: { gameId, launchKey: launchKey.current },
			}),
	});
	const play = useMutation({
		mutationFn: (input: {
			sessionId: string;
			stakeMinor: number;
			idempotencyKey: string;
		}) => playCurrentPlayerDemoGame({ data: input }),
		onSuccess: async (result) => {
			if (result.bonusTransition?.status === "completed") {
				emitBonusCompletion({
					awardId: result.bonusTransition.awardId,
					convertedAmountMinor: result.bonusTransition.convertedAmountMinor,
					currencyCode: result.currencyCode,
				});
			}
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: bonusQueries.all }),
				queryClient.invalidateQueries({ queryKey: walletQueries.all }),
				queryClient.invalidateQueries({ queryKey: historyQueries.all }),
			]);
		},
		onSettled: () => {
			roundKey.current = null;
		},
	});
	const close = useMutation({
		mutationFn: (sessionId: string) =>
			closeCurrentPlayerGame({ data: { sessionId } }),
		onSuccess: async (result) => {
			setSummary(result);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: bonusQueries.all }),
				queryClient.invalidateQueries({ queryKey: walletQueries.all }),
				queryClient.invalidateQueries({ queryKey: historyQueries.all }),
			]);
		},
	});

	useEffect(() => {
		start.mutate();
	}, [start.mutate]);

	const session = start.data;
	const money = useMemo(
		() =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: session?.currencyCode ?? "USD",
				minimumFractionDigits: 2,
			}),
		[session?.currencyCode],
	);
	const stakeMinor = parseMoneyInput(stake);
	const availableBalance = play.data?.balanceMinor ?? session?.balanceMinor;
	const stakeError =
		stakeMinor === null || stakeMinor <= 0
			? "Enter a stake greater than 0 with no more than two decimal places."
			: availableBalance !== undefined && stakeMinor > availableBalance
				? "This stake is more than your playable balance."
				: null;

	function placeBet() {
		if (!session || stakeMinor === null || stakeError || roundKey.current)
			return;
		roundKey.current = crypto.randomUUID();
		play.mutate({
			sessionId: session.sessionId,
			stakeMinor,
			idempotencyKey: roundKey.current,
		});
	}

	if (start.isPending) return <GameLoading />;
	if (start.isError || !session)
		return (
			<GameError
				error={start.error}
				isRetrying={start.isPending}
				onRetry={() => start.mutate()}
			/>
		);
	if (session.launchMode === "provider")
		return (
			<BigBangProviderGame
				session={session}
				onClose={() => close.mutate(session.sessionId)}
				isClosing={close.isPending}
				error={close.isError ? errorMessage(close.error) : null}
			/>
		);
	if (summary?.kind === "provider")
		return <BigBangGameSummary summary={summary} />;
	if (summary)
		return (
			<GameSummary
				summary={summary}
				money={money}
				gameName={session.game.name}
			/>
		);
	const currentBalance = availableBalance ?? session.balanceMinor;

	return (
		<main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
			<header className="mb-5 flex items-center justify-between gap-3">
				<Link
					to="/"
					className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}
				>
					<ArrowLeftIcon /> Games
				</Link>
				<Button
					variant="outline"
					onClick={() => close.mutate(session.sessionId)}
					disabled={play.isPending || close.isPending}
				>
					{close.isPending ? (
						<LoaderCircleIcon className="animate-spin" />
					) : (
						<XIcon />
					)}
					End game
				</Button>
			</header>

			<Card className="relative overflow-hidden border border-primary/20 bg-[radial-gradient(circle_at_top,var(--color-primary)/12%,transparent_52%)]">
				<CardHeader className="text-center">
					<div className="mb-2 flex justify-center gap-2">
						<Badge variant="secondary">BearBet demo</Badge>
						<Badge variant="outline">Virtual funds</Badge>
					</div>
					<CardTitle className="font-logo text-3xl sm:text-4xl">
						Lucky Number
					</CardTitle>
					<CardDescription>
						{session.game.name} · Draw 1 to 45 to win 2× your stake
					</CardDescription>
				</CardHeader>
				<CardContent className="mx-auto w-full max-w-xl space-y-6">
					<div className="grid grid-cols-2 gap-3">
						<Metric
							label="Playable balance"
							value={money.format(currentBalance / 100)}
						/>
						<Metric label="Chance to win" value="45%" />
					</div>

					<div
						aria-live="polite"
						className={cn(
							"grid min-h-52 place-items-center rounded-3xl border bg-background/75 p-6 text-center",
							play.data?.outcome === "win" && "border-primary/50 bg-primary/8",
							play.data?.outcome === "loss" && "border-destructive/35",
						)}
					>
						{play.isPending ? (
							<div>
								<LoaderCircleIcon className="mx-auto size-12 animate-spin text-primary" />
								<p className="mt-3 font-medium">Drawing your number...</p>
							</div>
						) : play.data ? (
							<div>
								<div className="mx-auto grid size-24 place-items-center rounded-full border-4 border-primary bg-primary/10 font-logo text-5xl">
									{play.data.draw}
								</div>
								<p className="mt-4 text-xl font-semibold">
									{play.data.outcome === "win"
										? `You won ${money.format(play.data.winAmountMinor / 100)}`
										: `You lost ${money.format(play.data.stakeMinor / 100)}`}
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									New balance {money.format(play.data.balanceMinor / 100)}
								</p>
							</div>
						) : (
							<div>
								<SparklesIcon className="mx-auto size-12 text-primary" />
								<p className="mt-3 text-lg font-semibold">
									Choose a stake and play
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									Each play creates one recorded bet and settlement.
								</p>
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="game-stake">Stake</Label>
						<div className="flex gap-2">
							<Input
								id="game-stake"
								inputMode="decimal"
								value={stake}
								onChange={(event) => setStake(event.target.value)}
								disabled={play.isPending}
								aria-invalid={Boolean(stakeError)}
							/>
							<Button
								size="lg"
								onClick={placeBet}
								disabled={play.isPending || Boolean(stakeError)}
								className="min-w-28"
							>
								{play.isPending ? (
									<LoaderCircleIcon className="animate-spin" />
								) : play.data ? (
									<RotateCcwIcon />
								) : (
									<CircleDollarSignIcon />
								)}
								{play.data ? "Play again" : "Play"}
							</Button>
						</div>
						{stakeError ? (
							<p className="text-xs text-destructive">{stakeError}</p>
						) : null}
						{play.isError ? (
							<p className="text-sm text-destructive">
								{errorMessage(play.error)}
							</p>
						) : null}
					</div>
				</CardContent>
				<CardFooter className="justify-center text-center text-xs text-muted-foreground">
					Demo odds are fixed at a 45% chance of a 2× total return, for a 90%
					theoretical return.
				</CardFooter>
			</Card>
		</main>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border bg-background/60 p-4 text-center">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 text-lg font-semibold">{value}</p>
		</div>
	);
}

function GameLoading() {
	return (
		<main className="grid min-h-[65vh] place-items-center px-4 text-center">
			<div>
				<LoaderCircleIcon className="mx-auto size-10 animate-spin text-primary" />
				<p className="mt-3 font-medium">Starting your game...</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Checking the game and your playable balance.
				</p>
			</div>
		</main>
	);
}

function GameError({
	error,
	isRetrying,
	onRetry,
}: {
	error: Error | null;
	isRetrying: boolean;
	onRetry: () => void;
}) {
	return (
		<main className="grid min-h-[65vh] place-items-center px-4">
			<Card className="w-full max-w-md text-center">
				<CardHeader>
					<CardTitle>Game could not start</CardTitle>
					<CardDescription>{errorMessage(error)}</CardDescription>
				</CardHeader>
				<CardFooter className="justify-center gap-2">
					<Link to="/" className={buttonVariants({ variant: "outline" })}>
						Games
					</Link>
					<Button onClick={onRetry} disabled={isRetrying}>
						Try again
					</Button>
				</CardFooter>
			</Card>
		</main>
	);
}

function GameSummary({
	summary,
	money,
	gameName,
}: {
	summary: Extract<
		Awaited<ReturnType<typeof closeCurrentPlayerGame>>,
		{ kind: "demo" }
	>;
	money: Intl.NumberFormat;
	gameName: string;
}) {
	return (
		<main className="grid min-h-[70vh] place-items-center px-4 py-8">
			<Card className="w-full max-w-lg">
				<CardHeader className="text-center">
					<CardTitle className="font-logo text-3xl">Session complete</CardTitle>
					<CardDescription>{gameName}</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-3">
					<Metric label="Rounds played" value={String(summary.roundsPlayed)} />
					<Metric
						label="Total staked"
						value={money.format(summary.stakedMinor / 100)}
					/>
					<Metric
						label="Total returned"
						value={money.format(summary.returnedMinor / 100)}
					/>
					<Metric
						label="Net result"
						value={`${summary.netMinor >= 0 ? "+" : ""}${money.format(summary.netMinor / 100)}`}
					/>
				</CardContent>
				<CardFooter className="flex-col gap-3">
					<p className="text-sm text-muted-foreground">
						Wallet after play: {money.format(summary.balanceMinor / 100)}
					</p>
					<Link to="/" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
						Back to games
					</Link>
				</CardFooter>
			</Card>
		</main>
	);
}

type BigBangProviderSession = Extract<
	Awaited<ReturnType<typeof startCurrentPlayerGame>>,
	{ launchMode: "provider" }
>;

function BigBangProviderGame({
	session,
	onClose,
	isClosing,
	error,
}: {
	session: BigBangProviderSession;
	onClose: () => void;
	isClosing: boolean;
	error: string | null;
}) {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
			<header className="mb-5 flex items-center justify-between gap-3">
				<Link
					to="/"
					className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}
				>
					<ArrowLeftIcon /> Games
				</Link>
				<Button variant="outline" onClick={onClose} disabled={isClosing}>
					{isClosing ? (
						<LoaderCircleIcon className="animate-spin" />
					) : (
						<XIcon />
					)}
					End and reconcile
				</Button>
			</header>

			<Card className="overflow-hidden border border-primary/20 bg-[radial-gradient(circle_at_top,var(--color-primary)/12%,transparent_52%)]">
				<CardHeader>
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">BigBang provider sandbox</Badge>
						<Badge variant="outline">Provider-managed funds</Badge>
					</div>
					<CardTitle className="font-logo text-3xl sm:text-4xl">
						{session.game.name}
					</CardTitle>
					<CardDescription>
						{[session.game.category, session.game.provider]
							.filter(Boolean)
							.join(" · ")}
						<br />
						Live gameplay is hosted by BigBang. BearBet reconciles only the net
						provider balance change when you end the session.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-hidden rounded-2xl border bg-black shadow-2xl">
						<iframe
							title={`${session.game.name} BigBang provider sandbox`}
							src={session.launchUrl}
							allow="autoplay; fullscreen"
							className="aspect-video min-h-[26rem] w-full border-0 sm:min-h-[36rem]"
						/>
					</div>
					<div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
						<p>
							Provider balance at launch:{" "}
							{formatMoney(session.balanceMinor, session.currencyCode)}
						</p>
						<a
							href={session.launchUrl}
							target="_blank"
							rel="noreferrer"
							className="font-medium text-primary hover:underline"
						>
							Open game in a new tab
						</a>
					</div>
					{error ? (
						<p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
							{error}
						</p>
					) : null}
				</CardContent>
			</Card>
		</main>
	);
}

type BigBangGameSummaryResult = Extract<
	Awaited<ReturnType<typeof closeCurrentPlayerGame>>,
	{ kind: "provider" }
>;

function BigBangGameSummary({
	summary,
}: {
	summary: BigBangGameSummaryResult;
}) {
	return (
		<main className="grid min-h-[70vh] place-items-center px-4 py-8">
			<Card className="w-full max-w-lg">
				<CardHeader className="text-center">
					<div className="mb-2 flex justify-center gap-2">
						<Badge variant="secondary">BigBang sandbox</Badge>
						<Badge variant="outline">Session reconciliation</Badge>
					</div>
					<CardTitle className="font-logo text-3xl">Session complete</CardTitle>
					<CardDescription>
						The provider balance was reconciled at session close.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-3">
					<Metric
						label="Provider balance at launch"
						value={formatMoney(
							summary.providerBalanceBeforeMinor,
							summary.currencyCode,
						)}
					/>
					<Metric
						label="Provider balance at close"
						value={formatMoney(
							summary.providerBalanceAfterMinor,
							summary.currencyCode,
						)}
					/>
					<Metric
						label="Net provider change"
						value={`${summary.netDeltaMinor >= 0 ? "+" : ""}${formatMoney(summary.netDeltaMinor, summary.currencyCode)}`}
					/>
					<Metric
						label="BearBet wallet"
						value={formatMoney(
							summary.walletBalanceMinor,
							summary.currencyCode,
						)}
					/>
				</CardContent>
				<CardFooter className="flex-col gap-3">
					<p className="text-center text-sm text-muted-foreground">
						{summary.netDeltaMinor === 0
							? "There was no net provider balance change for this session."
							: summary.reconciliationApplied
								? "The net change was recorded as one BigBang sandbox reconciliation."
								: "Wallet reconciliation is disabled; the provider result was recorded for reference."}
					</p>
					<Link to="/" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
						Back to games
					</Link>
				</CardFooter>
			</Card>
		</main>
	);
}

function formatMoney(amountMinor: number, currencyCode: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currencyCode,
		minimumFractionDigits: 2,
	}).format(amountMinor / 100);
}

function parseMoneyInput(value: string) {
	if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return null;
	const [whole = "0", fraction = ""] = value.split(".");
	const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
	return Number.isSafeInteger(minor) ? minor : null;
}

function errorMessage(error: unknown) {
	return error instanceof Error
		? error.message
		: "Something went wrong. Try again.";
}
