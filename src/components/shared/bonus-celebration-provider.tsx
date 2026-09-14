"use client";

import { TrophyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	type BonusCompletionEvent,
	subscribeToBonusCompletions,
} from "#/lib/bonus-events";

const celebrationColors = ["#ffdd00", "#fff6c2", "#d7a928", "#ffffff"];

async function launchCelebration() {
	const { default: confetti } = await import("canvas-confetti");
	const options = {
		particleCount: 54,
		spread: 68,
		startVelocity: 42,
		gravity: 0.9,
		ticks: 180,
		colors: celebrationColors,
		disableForReducedMotion: true,
		zIndex: 60,
	};

	await Promise.all([
		confetti({ ...options, angle: 62, origin: { x: 0, y: 0.72 } }),
		confetti({ ...options, angle: 118, origin: { x: 1, y: 0.72 } }),
	]);
}

export function BonusCelebrationProvider() {
	const [completion, setCompletion] = useState<BonusCompletionEvent | null>(
		null,
	);
	const seenAwards = useRef(new Set<string>());

	useEffect(
		() =>
			subscribeToBonusCompletions((event) => {
				if (seenAwards.current.has(event.awardId)) return;
				seenAwards.current.add(event.awardId);
				setCompletion(event);
				requestAnimationFrame(() => void launchCelebration());
			}),
		[],
	);

	const money = completion
		? new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: completion.currencyCode,
			}).format(completion.convertedAmountMinor / 100)
		: null;

	return (
		<Dialog
			open={Boolean(completion)}
			onOpenChange={(open) => {
				if (!open) setCompletion(null);
			}}
		>
			<DialogContent className="z-[70] max-w-md text-center">
				<div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
					<TrophyIcon className="size-7" />
				</div>
				<DialogHeader className="mt-5 pr-0">
					<DialogTitle className="font-logo text-3xl">
						Bonus complete
					</DialogTitle>
					<DialogDescription className="mx-auto max-w-sm text-base">
						You reached the playthrough target. Your remaining {money} bonus
						balance is now demo cash.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="sm:justify-center">
					<DialogClose render={<Button variant="ghost" />}>
						Keep playing
					</DialogClose>
					<a
						href="/wallet"
						className={buttonVariants()}
						onClick={() => setCompletion(null)}
					>
						View wallet
					</a>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
