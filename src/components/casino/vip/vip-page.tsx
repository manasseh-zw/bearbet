import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightIcon,
	CrownIcon,
	GiftIcon,
	HeadsetIcon,
	SparklesIcon,
	TrophyIcon,
} from "lucide-react";

import { buttonVariants } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

const benefits: Array<{
	description: string;
	icon: LucideIcon;
	title: string;
}> = [
	{
		title: "VIP-only events",
		description:
			"Invitations to special tables, tournaments, and BearBet moments.",
		icon: TrophyIcon,
	},
	{
		title: "Exclusive promotions",
		description:
			"Offers designed for the players who make BearBet their regular stop.",
		icon: GiftIcon,
	},
	{
		title: "Dedicated support",
		description: "A more personal way to get help when you need it.",
		icon: HeadsetIcon,
	},
	{
		title: "Tailored rewards",
		description: "Thoughtful extras and rewards shaped around your play.",
		icon: SparklesIcon,
	},
];

export function VipPage() {
	const { data: session } = authClient.useSession();
	const isSignedIn = Boolean(session?.user);

	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
			<section className="grid overflow-hidden rounded-2xl border border-white/8 bg-card lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.72fr)]">
				<div className="relative min-h-72 overflow-hidden bg-[#1b130b] sm:min-h-96 lg:min-h-[31rem]">
					<img
						src="/images/vip_banner.png"
						alt="BearBet's VIP Club banner with a suited bear at a casino table"
						className="absolute inset-0 size-full object-cover object-center"
					/>
					<div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/5 via-transparent to-black/35" />
					<div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm sm:bottom-5 sm:left-5">
						BearBet VIP Club
					</div>
				</div>

				<div className="flex flex-col justify-between border-t border-white/8 px-6 py-8 sm:px-8 sm:py-10 lg:border-t-0 lg:border-l lg:px-10">
					<div>
						<div className="flex items-center gap-2 text-primary">
							<CrownIcon className="size-5" aria-hidden="true" />
							<span className="text-xs font-semibold tracking-[0.2em] uppercase">
								VIP club
							</span>
						</div>
						<h1 className="mt-4 max-w-sm font-logo text-4xl leading-[0.98] text-foreground sm:text-5xl">
							A little more BearBet is coming.
						</h1>
						<p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
							We are shaping a VIP club for players who want more from their
							time at BearBet. The club is not live yet, but this is where the
							good stuff will land first.
						</p>
					</div>

					<div className="mt-10 border-t border-border pt-6">
						<div className="flex items-center gap-2 text-sm font-semibold text-primary">
							<span
								className="size-2 rounded-full bg-primary"
								aria-hidden="true"
							/>
							Coming soon
						</div>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							We will share more when the first VIP invitations are ready.
						</p>
						<Link
							to={isSignedIn ? "/" : "/register"}
							className={buttonVariants({
								size: "lg",
								className: "mt-6 h-12 w-full text-base font-bold",
							})}
						>
							{isSignedIn ? "Explore the casino" : "Create an account"}
							<ArrowRightIcon data-icon="inline-end" />
						</Link>
						{!isSignedIn ? (
							<p className="mt-4 text-center text-xs text-muted-foreground">
								Already playing?{" "}
								<Link
									to="/login"
									className="text-foreground underline-offset-4 hover:underline"
								>
									Sign in
								</Link>
							</p>
						) : null}
					</div>
				</div>
			</section>

			<section
				className="mt-12 pb-10 sm:mt-16"
				aria-labelledby="vip-benefits-title"
			>
				<div className="max-w-2xl">
					<h2
						id="vip-benefits-title"
						className="font-logo text-3xl text-foreground sm:text-4xl"
					>
						Planned benefits
					</h2>
					<p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
						A first look at what we are working towards. Details will be
						confirmed when the VIP club opens.
					</p>
				</div>

				<div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
					{benefits.map(({ description, icon: Icon, title }) => (
						<div className="border-t border-border pt-5" key={title}>
							<Icon className="size-5 text-primary" aria-hidden="true" />
							<h3 className="mt-4 text-base font-semibold text-foreground">
								{title}
							</h3>
							<p className="mt-2 text-sm leading-6 text-muted-foreground">
								{description}
							</p>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
