"use client";

import {
	ArrowRightIcon,
	Clock3Icon,
	GiftIcon,
	ShieldCheckIcon,
	SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";

const bonusOffers = [
	{
		name: "Bear Hug Welcome Bonus",
		type: "Welcome offer",
		image: "/images/bear_hug.png",
		description: "Start with $100 in bonus funds and a simple 1× playthrough.",
		details: ["$100 bonus", "1× wagering", "All games eligible"],
		accent: "group-hover:border-amber-400/50",
	},
	{
		name: "Honey Pot Reload",
		type: "Top-up offer",
		image: "/images/honey_pot.png",
		description: "Add demo funds and receive a 20% bonus, up to $100.",
		details: ["20% demo match", "2× wagering", "Slots eligible"],
		accent: "group-hover:border-fuchsia-400/45",
	},
	{
		name: "Lucky Paw Weekend",
		type: "Weekend offer",
		image: "/images/lucky_paw.png",
		description:
			"A $75 weekend bonus for a rotating selection of casino games.",
		details: ["$75 bonus", "1× wagering", "Selected games"],
		accent: "group-hover:border-emerald-400/45",
	},
] as const;

export function BonusesPage() {
	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<section
				aria-labelledby="bonus-hero-title"
				className="relative isolate mb-10 min-h-[25rem] overflow-hidden rounded-3xl border bg-[#242421] sm:min-h-[22rem] lg:min-h-[25rem]"
			>
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_45%,rgba(254,228,2,0.13),transparent_36%)]" />
				<div className="relative z-10 flex max-w-2xl flex-col items-start px-6 pt-8 sm:px-10 sm:pt-10 lg:px-14 lg:py-14">
					<Badge className="mb-5 gap-1.5 rounded-full px-3 py-1.5">
						<SparklesIcon /> BearBet bonuses
					</Badge>
					<h1
						id="bonus-hero-title"
						className="max-w-xl font-logo text-4xl leading-[0.95] text-balance sm:text-5xl lg:text-6xl"
					>
						A little extra luck goes a long way.
					</h1>
					<p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
						Choose one offer, play eligible games, and turn the remaining bonus
						into cash when you complete its wagering target.
					</p>
					<BonusCountdown />
				</div>

				<img
					src="/images/bonus_bear.png"
					alt="BearBet bear dressed for the casino"
					className="pointer-events-none absolute -right-20 -bottom-20 z-0 w-[25rem] max-w-none select-none sm:-right-10 sm:-bottom-24 sm:w-[31rem] lg:-right-2 lg:-bottom-36 lg:w-[39rem]"
				/>
			</section>

			<section aria-labelledby="live-bonuses-title">
				<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
							Pick your perk
						</p>
						<h2
							id="live-bonuses-title"
							className="mt-1 font-logo text-3xl sm:text-4xl"
						>
							Live bonus offers
						</h2>
					</div>
					<p className="max-w-md text-sm text-muted-foreground sm:text-right">
						You can keep one bonus active at a time. Activation is coming in the
						next build.
					</p>
				</div>

				<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{bonusOffers.map((offer) => (
						<article
							key={offer.name}
							className={`group overflow-hidden rounded-2xl border bg-card transition-[transform,border-color] duration-200 ease-out hover:-translate-y-1 motion-reduce:transform-none ${offer.accent}`}
						>
							<div className="aspect-3/2 overflow-hidden border-b bg-muted">
								<img
									src={offer.image}
									alt=""
									className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025] motion-reduce:transform-none"
								/>
							</div>
							<div className="flex min-h-64 flex-col p-5 sm:p-6">
								<Badge variant="secondary" className="mb-4 w-fit">
									{offer.type}
								</Badge>
								<h3 className="font-logo text-2xl leading-none">
									{offer.name}
								</h3>
								<p className="mt-3 text-sm leading-6 text-muted-foreground">
									{offer.description}
								</p>
								<ul
									className="mt-4 flex flex-wrap gap-2"
									aria-label="Offer details"
								>
									{offer.details.map((detail) => (
										<li
											key={detail}
											className="rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
										>
											{detail}
										</li>
									))}
								</ul>
								<Button className="mt-auto w-full" disabled>
									Enter now <ArrowRightIcon />
								</Button>
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="mt-8 grid gap-3 border-t pt-6 text-sm text-muted-foreground sm:grid-cols-3">
				<BonusNote
					icon={GiftIcon}
					title="Choose one"
					text="Only one bonus can be active on your account."
				/>
				<BonusNote
					icon={Clock3Icon}
					title="Watch the clock"
					text="Each offer has its own activation and expiry window."
				/>
				<BonusNote
					icon={ShieldCheckIcon}
					title="Virtual funds only"
					text="BearBet bonuses and winnings have no cash value."
				/>
			</section>
		</main>
	);
}

function BonusCountdown() {
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

	return (
		<div className="mt-7 flex items-center gap-3 rounded-2xl border bg-background/35 px-4 py-3 backdrop-blur-sm">
			<div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
				<Clock3Icon className="size-4" />
			</div>
			<div>
				<p className="text-xs text-muted-foreground">Next bonus drop</p>
				<p className="mt-0.5 font-medium tabular-nums" aria-live="polite">
					{remaining
						? `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`
						: "Calculating..."}
				</p>
			</div>
		</div>
	);
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

function BonusNote({
	icon: Icon,
	title,
	text,
}: {
	icon: typeof GiftIcon;
	title: string;
	text: string;
}) {
	return (
		<div className="flex gap-3 py-2">
			<Icon className="mt-0.5 size-4 shrink-0 text-primary" />
			<div>
				<p className="font-medium text-foreground">{title}</p>
				<p className="mt-1 leading-5">{text}</p>
			</div>
		</div>
	);
}
