"use client";

import { ArrowRightIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";

const bonusOffers = [
	{
		name: "Bear Hug Welcome Bonus",
		image: "/images/bear_hug.png",
		amount: "$100 bonus",
		wagering: "1× playthrough",
		description: "Available to new BearBet players across the casino.",
	},
	{
		name: "Honey Pot Reload",
		image: "/images/honey_pot.png",
		amount: "20% match",
		wagering: "2× playthrough",
		description: "Add demo funds and receive up to $100 for eligible slots.",
	},
	{
		name: "Lucky Paw Weekend",
		image: "/images/lucky_paw.png",
		amount: "$75 bonus",
		wagering: "1× playthrough",
		description: "A weekend offer for a rotating selection of casino games.",
	},
] as const;

export function BonusesPage() {
	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<section
				aria-labelledby="bonus-hero-title"
				className="grid min-h-[31rem] overflow-hidden rounded-2xl border bg-[#222220] md:my-8 md:min-h-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:overflow-visible"
			>
				<div className="relative min-h-64 border-b md:min-h-[21rem] md:border-r md:border-b-0">
					<img
						src="/images/bonus_bear.png"
						alt="BearBet bear holding playing cards"
						className="pointer-events-none absolute inset-0 size-full object-contain p-4 select-none sm:p-5 md:inset-auto md:bottom-[-2rem] md:left-1/2 md:z-10 md:h-[25rem] md:w-auto md:max-w-none md:-translate-x-1/2 md:p-0"
					/>
				</div>

				<div className="flex flex-col justify-center px-6 py-8 sm:px-9 md:px-10 md:py-10 lg:px-12">
					<h1
						id="bonus-hero-title"
						className="max-w-lg font-logo text-3xl leading-[0.98] text-balance sm:text-4xl lg:text-[2.75rem]"
					>
						Your next <span className="text-primary">bonus</span> is closer than
						you think.
					</h1>
					<p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
						Choose one offer and complete its playthrough to turn the remaining
						bonus into demo cash.
					</p>
					<BonusCountdown />
				</div>
			</section>

			<section aria-labelledby="live-bonuses-title" className="mt-10 sm:mt-12">
				<h2
					id="live-bonuses-title"
					className="font-sans text-3xl leading-none font-bold tracking-tight sm:text-4xl"
				>
					Live bonus offers
				</h2>

				<div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
					{bonusOffers.map((offer) => (
						<article
							key={offer.name}
							className="group overflow-hidden rounded-2xl border-2 border-border bg-card transition-colors duration-200 hover:border-primary focus-within:border-primary"
						>
							<h3 className="sr-only">{offer.name}</h3>
							<div className="aspect-3/2 overflow-hidden border-b bg-muted">
								<img
									src={offer.image}
									alt={`${offer.name} campaign artwork`}
									className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.015] motion-reduce:transform-none"
								/>
							</div>

							<div className="p-5 sm:p-6">
								<p className="min-h-10 text-sm leading-5 text-muted-foreground">
									{offer.description}
								</p>
								<Separator className="my-5" />
								<dl className="grid grid-cols-2 gap-5">
									<div>
										<dt className="text-xs text-muted-foreground">Offer</dt>
										<dd className="mt-1 text-sm font-medium">{offer.amount}</dd>
									</div>
									<div>
										<dt className="text-xs text-muted-foreground">
											Requirement
										</dt>
										<dd className="mt-1 text-sm font-medium">
											{offer.wagering}
										</dd>
									</div>
								</dl>
								<Button className="mt-6" disabled>
									Enter now <ArrowRightIcon />
								</Button>
							</div>
						</article>
					))}
				</div>
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
				<span className="size-1.5 rounded-full bg-primary" />
				Next bonus drop
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
