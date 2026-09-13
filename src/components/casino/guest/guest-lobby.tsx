import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, DicesIcon, SpadeIcon } from "lucide-react";

import featuredGames from "#/components/casino/guest/featured-games.json";
import { GameCard } from "#/components/casino/shared/game-card";
import { Button } from "#/components/ui/button";
import { TiltCard } from "#/components/unlumen-ui/tilt-card";

const featureCards = [
	{
		title: "Slots & instant games",
		description: "Bright reels, quick rounds and new worlds to discover.",
		label: "Explore slots",
		imageUrl:
			"https://gator.drakon.casino/storage/drakon/15-Dragon-Pearls.webp",
		icon: DicesIcon,
		className:
			"bg-[radial-gradient(circle_at_82%_82%,rgba(240,178,0,0.25),transparent_34%),linear-gradient(135deg,#272218,#181817_68%)]",
	},
	{
		title: "Live tables",
		description: "Take a seat for blackjack, roulette and baccarat.",
		label: "Browse tables",
		imageUrl:
			"https://gator.drakon.casino/storage/drakon/Galactic-VIP-Roulette.webp",
		icon: SpadeIcon,
		className:
			"bg-[radial-gradient(circle_at_82%_82%,rgba(126,82,204,0.3),transparent_34%),linear-gradient(135deg,#211d2b,#181817_68%)]",
	},
] as const;

export function GuestLobby() {
	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
			<section className="grid overflow-hidden rounded-2xl border border-white/8 bg-card lg:grid-cols-[minmax(0,2fr)_minmax(18rem,0.68fr)]">
				<div className="relative min-h-56 overflow-hidden sm:min-h-64 lg:min-h-[19rem]">
					<img
						src="/images/bb_promotional_banner.png"
						alt="Bearbet casino host surrounded by cards and casino tables"
						className="absolute inset-0 size-full object-cover object-center"
					/>
					<div className="absolute inset-0 bg-linear-to-r from-black/15 via-transparent to-black/15" />
					<div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/55 to-transparent lg:hidden" />
				</div>

				<div className="flex flex-col items-center justify-center border-t border-white/8 px-6 py-8 text-center lg:border-t-0 lg:border-l">
					<p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
						The tables are open
					</p>
					<h1 className="mt-3 font-logo text-3xl leading-[0.95] text-foreground sm:text-4xl">
						Welcome to BearBet
					</h1>
					<p className="mt-4 whitespace-nowrap text-sm leading-6 text-muted-foreground">
						Find your next favourite.
					</p>
					<Button
						render={<Link to="/register" />}
						size="lg"
						className="mt-6 h-12 min-w-56 px-8 text-base font-bold"
					>
						Register now <ArrowRightIcon />
					</Button>
					<p className="mt-4 text-xs text-muted-foreground">
						Already playing?{" "}
						<Link
							to="/login"
							className="text-foreground underline-offset-4 hover:underline"
						>
							Sign in
						</Link>
					</p>
				</div>
			</section>

			<section
				aria-label="Game collections"
				className="mt-5 grid gap-5 md:grid-cols-2"
			>
				{featureCards.map(({ icon: Icon, ...card }) => (
					<Link
						key={card.title}
						to="/"
						className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						<TiltCard
							title={card.title}
							description={card.description}
							imageSrc={card.imageUrl}
							imageAlt=""
							className={`h-64 rounded-2xl border-white/8 hover:border-[#171715] hover:ring-1 hover:ring-[#171715] sm:h-72 ${card.className}`}
							tiltProps={{ rotationFactor: 5 }}
						>
							<span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors group-hover:text-primary-foreground">
								<Icon className="size-4" /> {card.label}
							</span>
						</TiltCard>
					</Link>
				))}
			</section>

			<section className="mt-10 pb-10" aria-labelledby="top-games-title">
				<div className="mb-5 flex items-end justify-between gap-4">
					<div>
						<p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
							Hand-picked for the lobby
						</p>
						<h2
							id="top-games-title"
							className="mt-1.5 font-logo text-3xl text-foreground sm:text-4xl"
						>
							Top games
						</h2>
					</div>
					<span className="hidden text-sm text-muted-foreground sm:block">
						24 games
					</span>
				</div>

				<div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
					{featuredGames.map((game) => (
						<GameCard key={game.id} game={game} />
					))}
				</div>
			</section>
		</main>
	);
}
