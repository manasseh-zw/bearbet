import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "#/components/shared/brand";

type AuthLayoutProps = {
	children: ReactNode;
	imageAlt: string;
};

export function AuthLayout({ children, imageAlt }: AuthLayoutProps) {
	return (
		<div className="grid min-h-svh bg-background md:grid-cols-[minmax(24rem,1fr)_minmax(30rem,0.95fr)]">
			<aside className="relative hidden overflow-hidden bg-sidebar md:block md:h-svh">
				<img
					src="/images/bearbet_splash.png"
					alt={imageAlt}
					className="absolute inset-0 size-full object-cover object-center"
				/>
				<div className="absolute inset-0 bg-black/30" />
				<div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-12">
					<Link to="/" aria-label="BearBet home" className="inline-flex w-fit">
						<Logo className="text-2xl text-white" />
					</Link>

					<div className="max-w-sm">
						<p className="text-sm font-medium tracking-[0.16em] text-primary uppercase">
							BearBet casino
						</p>
						<h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-white xl:text-5xl">
							Your next game starts here.
						</h2>
						<p className="mt-5 max-w-xs text-sm leading-6 text-white/70">
							Sign in or create an account to pick up where you left off.
						</p>
					</div>
				</div>
			</aside>

			<section className="flex min-h-svh items-center overflow-y-auto bg-background px-5 py-10 sm:px-8 sm:py-12 md:px-12 md:py-16 xl:px-20">
				<div className="w-full max-w-[30rem]">{children}</div>
			</section>
		</div>
	);
}
