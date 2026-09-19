"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowRightIcon,
	CheckIcon,
	Clock3Icon,
	LoaderCircleIcon,
	LockKeyholeIcon,
	TargetIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { bonusQueries } from "#/lib/queries/bonus.queries";
import { historyQueries } from "#/lib/queries/history.queries";
import { walletQueries } from "#/lib/queries/wallet.queries";
import type { ActivateBonusInput } from "#/lib/schemas/bonus.schema";
import { emitToast } from "#/lib/toast-events";
import { cn } from "#/lib/utils";
import { activateCurrentPlayerBonus } from "#/server/domains/bonus/bonus.functions";

const offerArtwork: Record<string, string> = {
	BEAR_HUG_WELCOME: "/images/bear_hug.png",
	HONEY_POT_RELOAD: "/images/honey_pot.png",
	LUCKY_PAW_WEEKEND: "/images/lucky_paw.png",
};

type BonusOverview = Awaited<
	ReturnType<NonNullable<ReturnType<typeof bonusQueries.current>["queryFn"]>>
>;
type BonusDefinition = BonusOverview["definitions"][number];

export function BonusesPage() {
	const queryClient = useQueryClient();
	const bonuses = useQuery(bonusQueries.current());
	const wallet = useQuery(walletQueries.current());
	const activationKey = useRef<string | null>(null);
	const [selectedOffer, setSelectedOffer] = useState<BonusDefinition | null>(
		null,
	);
	const [showActive, setShowActive] = useState(false);
	const money = useMemo(
		() =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: wallet.data?.currencyCode ?? "USD",
			}),
		[wallet.data?.currencyCode],
	);

	const activation = useMutation({
		mutationFn: (input: ActivateBonusInput) =>
			activateCurrentPlayerBonus({ data: input }),
		onSuccess: async (result) => {
			setSelectedOffer(null);
			setShowActive(true);
			emitToast({
				title: "Bonus activated",
				description: `${formatMoney(result.award.awardedAmountMinor, money)} is ready to play.`,
			});
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: bonusQueries.all }),
				queryClient.invalidateQueries({ queryKey: walletQueries.all }),
				queryClient.invalidateQueries({ queryKey: historyQueries.all }),
			]);
		},
		onSettled: () => {
			activationKey.current = null;
		},
	});

	function activateSelected() {
		if (!selectedOffer || activation.isPending || activationKey.current) return;
		activationKey.current = crypto.randomUUID();
		activation.mutate({
			definitionId: selectedOffer.id,
			idempotencyKey: activationKey.current,
		});
	}

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<BonusHero />
			<section aria-labelledby="live-bonuses-title" className="mt-10 sm:mt-12">
				<div className="flex items-end justify-between gap-5">
					<h2
						id="live-bonuses-title"
						className="font-sans text-3xl leading-none font-bold tracking-tight sm:text-4xl"
					>
						Live bonus offers
					</h2>
					{bonuses.data?.activeAward ? (
						<Button variant="outline" onClick={() => setShowActive(true)}>
							View active bonus
						</Button>
					) : null}
				</div>
				{bonuses.isPending ? (
					<BonusGridSkeleton />
				) : bonuses.isError ? (
					<div className="mt-5 rounded-2xl border p-6">
						<p className="font-medium">We couldn't load the bonus offers.</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Check your connection, then try again.
						</p>
						<Button
							className="mt-4"
							variant="outline"
							disabled={bonuses.isFetching}
							onClick={() => bonuses.refetch()}
						>
							{bonuses.isFetching ? (
								<LoaderCircleIcon className="animate-spin" />
							) : null}{" "}
							Try again
						</Button>
					</div>
				) : bonuses.data?.definitions.length ? (
					<div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
						{bonuses.data.definitions.map((offer) => (
							<BonusOfferCard
								key={offer.id}
								offer={offer}
								activeAward={bonuses.data.activeAward}
								money={money}
								onOpen={() => {
									if (bonuses.data.activeAward?.award.definitionId === offer.id)
										setShowActive(true);
									else {
										activation.reset();
										setSelectedOffer(offer);
									}
								}}
							/>
						))}
					</div>
				) : (
					<div className="mt-5 rounded-2xl border p-7 text-center">
						<p className="font-medium">No bonuses are live right now.</p>
						<p className="mt-1 text-sm text-muted-foreground">
							The next offers will appear here when they open.
						</p>
					</div>
				)}
			</section>
			<ActivationDialog
				offer={selectedOffer}
				money={money}
				isPending={activation.isPending}
				error={activation.error}
				onOpenChange={(open) => {
					if (!open && !activation.isPending) setSelectedOffer(null);
				}}
				onConfirm={activateSelected}
			/>
			<ActiveBonusDialog
				active={bonuses.data?.activeAward ?? null}
				money={money}
				open={showActive}
				onOpenChange={setShowActive}
			/>
		</main>
	);
}

function BonusHero() {
	return (
		<section
			aria-labelledby="bonus-hero-title"
			className="mt-4 grid min-h-[31rem] overflow-visible rounded-2xl border bg-[#222220] md:my-8 md:min-h-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
		>
			<div className="relative min-h-48 border-b md:min-h-[21rem] md:border-r md:border-b-0">
				<img
					src="/images/bonus_bear.png"
					alt="BearBet bear holding playing cards"
					className="pointer-events-none absolute top-[-2rem] left-[62%] z-10 h-[19rem] w-auto max-w-none -translate-x-1/2 select-none md:top-auto md:bottom-[-2rem] md:left-1/2 md:h-[25rem]"
				/>
			</div>
			<div className="relative z-20 flex flex-col justify-center px-6 py-8 sm:px-9 md:px-10 md:py-10 lg:px-12">
				<h1
					id="bonus-hero-title"
					className="max-w-56 font-logo text-3xl leading-[0.98] text-balance sm:max-w-lg sm:text-4xl lg:text-[2.75rem]"
				>
					Your next <span className="text-primary">bonus</span> is closer than
					you think.
				</h1>
				<p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
					Choose one offer and complete its playthrough to turn the remaining
					bonus into demo cash.
				</p>
				<BonusDropCountdown />
			</div>
		</section>
	);
}

function BonusOfferCard({
	offer,
	activeAward,
	money,
	onOpen,
}: {
	offer: BonusDefinition;
	activeAward: BonusOverview["activeAward"];
	money: Intl.NumberFormat;
	onOpen: () => void;
}) {
	const isActive = activeAward?.award.definitionId === offer.id;
	const isLocked = Boolean(activeAward && !isActive);
	const isUnavailable = isLocked || (offer.claimed && !isActive);
	const outcomeLabel =
		offer.latestAward?.status === "completed"
			? "Bonus won"
			: offer.latestAward?.status === "expired"
				? "Expired"
				: offer.latestAward?.status === "exhausted"
					? "Bonus used"
					: offer.latestAward?.status === "cancelled"
						? "Ended"
						: null;
	const actionLabel = isActive
		? "View progress"
		: isLocked
			? "Another bonus is active"
			: offer.claimed
				? "Already claimed"
				: "View offer";
	return (
		<article
			className={cn(
				"group relative overflow-hidden rounded-2xl border-2 bg-card transition-[border-color,opacity,filter] duration-200",
				isActive
					? "border-primary"
					: "border-border hover:border-primary focus-within:border-primary",
				isLocked && "opacity-55 grayscale-[0.65] hover:border-border",
				outcomeLabel && "grayscale-[0.8] hover:border-border",
			)}
		>
			{outcomeLabel ? (
				<div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/62 px-6 text-center supports-backdrop-filter:backdrop-blur-[1px]">
					<p
						className={cn(
							"font-logo text-4xl leading-none uppercase sm:text-5xl",
							offer.latestAward?.status === "completed"
								? "text-primary"
								: "text-foreground",
						)}
					>
						{outcomeLabel}
					</p>
				</div>
			) : null}
			<h3 className="sr-only">{offer.name}</h3>
			<div className="relative aspect-3/2 overflow-hidden border-b bg-muted">
				<img
					src={
						offer.thumbnailUrl ??
						offerArtwork[offer.code] ??
						"/images/bonus_bear.png"
					}
					alt={`${offer.name} campaign artwork`}
					className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.015] motion-reduce:transform-none"
				/>
				{isActive ? (
					<span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
						<CheckIcon className="size-3.5" /> Active
					</span>
				) : null}
			</div>
			<div className="p-5 sm:p-6">
				<p className="min-h-10 text-sm leading-5 text-muted-foreground">
					{offer.description}
				</p>
				<Separator className="my-5" />
				<dl className="grid grid-cols-2 gap-5">
					<div>
						<dt className="text-xs text-muted-foreground">Offer</dt>
						<dd className="mt-1 text-sm font-medium">
							{offer.matchPercentageBps
								? `${offer.matchPercentageBps / 100}% match`
								: `${formatMoney(offer.amountMinor, money)} bonus`}
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">Requirement</dt>
						<dd className="mt-1 text-sm font-medium">
							{offer.wageringMultiplier}× playthrough
						</dd>
					</div>
				</dl>
				<Button
					className="mt-6"
					variant={isActive ? "default" : "outline"}
					disabled={isUnavailable}
					onClick={onOpen}
				>
					{isLocked ? <LockKeyholeIcon /> : null}
					{actionLabel}
					{!isUnavailable ? <ArrowRightIcon /> : null}
				</Button>
			</div>
		</article>
	);
}

function ActivationDialog({
	offer,
	money,
	isPending,
	error,
	onOpenChange,
	onConfirm,
}: {
	offer: BonusDefinition | null;
	money: Intl.NumberFormat;
	isPending: boolean;
	error: Error | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}) {
	return (
		<Dialog open={Boolean(offer)} onOpenChange={onOpenChange}>
			<DialogContent>
				{offer ? (
					<>
						<DialogHeader>
							<DialogTitle>Enter {offer.name}?</DialogTitle>
							<DialogDescription>
								This starts the bonus as soon as you confirm. You can keep one
								bonus active at a time.
							</DialogDescription>
						</DialogHeader>
						<div className="mt-6 divide-y rounded-xl border px-4">
							<DisclosureRow
								icon={TargetIcon}
								label="Playthrough"
								value={`${offer.wageringMultiplier}× the awarded bonus`}
							/>
							<DisclosureRow
								icon={Clock3Icon}
								label="Time limit"
								value={`${offer.expiresAfterDays} days after activation`}
							/>
							<DisclosureRow
								icon={LockKeyholeIcon}
								label="When time runs out"
								value="Any remaining bonus balance is forfeited"
							/>
						</div>
						{offer.type === "deposit" ? (
							<p className="mt-4 text-sm leading-6 text-muted-foreground">
								We'll apply the match to your latest unused qualifying demo
								top-up, up to{" "}
								{formatMoney(
									offer.maximumAwardMinor ?? offer.amountMinor,
									money,
								)}
								.
							</p>
						) : null}
						{error ? (
							<p role="alert" className="mt-4 text-sm text-destructive">
								{activationErrorMessage(error)}
							</p>
						) : null}
						<DialogFooter>
							<DialogClose
								render={<Button variant="ghost" disabled={isPending} />}
							>
								Not now
							</DialogClose>
							<Button disabled={isPending} onClick={onConfirm}>
								{isPending ? (
									<LoaderCircleIcon className="animate-spin" />
								) : null}
								Accept and enter
							</Button>
						</DialogFooter>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function ActiveBonusDialog({
	active,
	money,
	open,
	onOpenChange,
}: {
	active: BonusOverview["activeAward"];
	money: Intl.NumberFormat;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const remaining = useTimeRemaining(active?.award.expiresAt ?? null);
	if (!active) return null;
	const completed = active.award.completedWagerMinor;
	const required = active.award.requiredWagerMinor;
	const percent =
		required > 0 ? Math.min(100, (completed / required) * 100) : 0;
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{active.definition.name}</DialogTitle>
					<DialogDescription>
						Eligible bonus-funded bets move you toward the playthrough target.
					</DialogDescription>
				</DialogHeader>
				<div className="mt-7">
					<div className="flex items-end justify-between gap-4">
						<div>
							<p className="text-xs text-muted-foreground">
								Playthrough progress
							</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">
								{Math.floor(percent)}%
							</p>
						</div>
						<p className="text-right text-sm tabular-nums text-muted-foreground">
							{formatMoney(completed, money)} of {formatMoney(required, money)}
						</p>
					</div>
					<div
						className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
						role="progressbar"
						aria-label="Bonus playthrough progress"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.floor(percent)}
					>
						<div
							className="h-full rounded-full bg-primary"
							style={{ width: `${percent}%` }}
						/>
					</div>
				</div>
				<dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-t pt-6">
					<div>
						<dt className="text-xs text-muted-foreground">Bonus balance</dt>
						<dd className="mt-1 font-medium tabular-nums">
							{formatMoney(active.award.bonusBalanceMinor, money)}
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">Remaining wager</dt>
						<dd className="mt-1 font-medium tabular-nums">
							{formatMoney(Math.max(0, required - completed), money)}
						</dd>
					</div>
					<div className="col-span-2">
						<dt className="text-xs text-muted-foreground">Time remaining</dt>
						<dd className="mt-1 font-logo text-lg tabular-nums">
							{remaining ?? "Calculating..."}
						</dd>
					</div>
				</dl>
				<p className="mt-6 text-sm leading-6 text-muted-foreground">
					When you reach the target, your remaining bonus balance moves to demo
					cash. If time expires first, the remaining bonus is forfeited.
				</p>
				<DialogFooter>
					<DialogClose render={<Button />}>Keep playing</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DisclosureRow({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Clock3Icon;
	label: string;
	value: string;
}) {
	return (
		<div className="flex gap-3 py-4">
			<Icon className="mt-0.5 size-4 shrink-0 text-primary" />
			<div>
				<p className="text-sm font-medium">{label}</p>
				<p className="mt-0.5 text-sm leading-5 text-muted-foreground">
					{value}
				</p>
			</div>
		</div>
	);
}

function BonusGridSkeleton() {
	return (
		<div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
			{[0, 1, 2].map((item) => (
				<div key={item} className="overflow-hidden rounded-2xl border-2 p-5">
					<Skeleton className="aspect-3/2 w-full rounded-xl" />
					<Skeleton className="mt-5 h-4 w-4/5" />
					<Skeleton className="mt-3 h-4 w-2/3" />
					<Skeleton className="mt-8 h-8 w-28" />
				</div>
			))}
		</div>
	);
}

function BonusDropCountdown() {
	const [remaining, setRemaining] = useState<ReturnType<
		typeof timeUntilNextDrop
	> | null>(null);
	useEffect(() => {
		function update() {
			setRemaining(timeUntilNextDrop(new Date()));
		}
		update();
		const timer = window.setInterval(update, 1_000);
		return () => window.clearInterval(timer);
	}, []);
	const units = remaining
		? [
				{ label: "days", value: remaining.days },
				{ label: "hours", value: remaining.hours },
				{ label: "mins", value: remaining.minutes },
				{ label: "secs", value: remaining.seconds },
			]
		: null;
	return (
		<div className="mt-7 border-t pt-5">
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<span className="size-1.5 rounded-full bg-primary" /> Next bonus drop
			</div>
			<div className="mt-3 flex items-start" aria-live="polite">
				{units ? (
					units.map((unit, index) => (
						<div key={unit.label} className="flex items-start">
							<div className="min-w-11">
								<p className="font-logo text-2xl leading-none tabular-nums">
									{String(unit.value).padStart(2, "0")}
								</p>
								<p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
									{unit.label}
								</p>
							</div>
							{index < units.length - 1 ? (
								<span className="mx-2 mt-0.5 text-muted-foreground/50">:</span>
							) : null}
						</div>
					))
				) : (
					<p className="text-sm text-muted-foreground">
						Calculating next drop...
					</p>
				)}
			</div>
		</div>
	);
}

function useTimeRemaining(expiresAt: Date | string | null) {
	const [label, setLabel] = useState<string | null>(null);
	useEffect(() => {
		if (!expiresAt) return;
		function update() {
			const milliseconds = Math.max(
				0,
				new Date(expiresAt as Date | string).getTime() - Date.now(),
			);
			const totalMinutes = Math.floor(milliseconds / 60_000);
			const days = Math.floor(totalMinutes / 1_440);
			const hours = Math.floor((totalMinutes % 1_440) / 60);
			const minutes = totalMinutes % 60;
			setLabel(
				days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`,
			);
		}
		update();
		const timer = window.setInterval(update, 30_000);
		return () => window.clearInterval(timer);
	}, [expiresAt]);
	return label;
}

function timeUntilNextDrop(now: Date) {
	const target = new Date(now);
	const daysUntilFriday = (5 - target.getUTCDay() + 7) % 7;
	target.setUTCDate(target.getUTCDate() + daysUntilFriday);
	target.setUTCHours(18, 0, 0, 0);
	if (target.getTime() <= now.getTime())
		target.setUTCDate(target.getUTCDate() + 7);
	let seconds = Math.max(
		0,
		Math.floor((target.getTime() - now.getTime()) / 1_000),
	);
	const days = Math.floor(seconds / 86_400);
	seconds %= 86_400;
	const hours = Math.floor(seconds / 3_600);
	seconds %= 3_600;
	const minutes = Math.floor(seconds / 60);
	seconds %= 60;
	return { days, hours, minutes, seconds };
}

function formatMoney(valueMinor: number, formatter: Intl.NumberFormat) {
	return formatter.format(valueMinor / 100);
}

function activationErrorMessage(error: Error) {
	if (error.message.includes("qualifying") || error.message.includes("Top-up"))
		return "This offer needs an unused qualifying demo top-up. Add funds in your wallet, then try again.";
	if (error.message.includes("active bonus"))
		return "You already have an active bonus.";
	if (error.message.includes("already claimed"))
		return "You have already used this offer.";
	return "We couldn't activate this bonus. Close the dialog and try again.";
}
