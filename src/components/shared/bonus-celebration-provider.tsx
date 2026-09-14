"use client";

import { Link } from "@tanstack/react-router";
import { TrophyIcon } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

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

import "./bonus-celebration.css";

const confetti = Array.from({ length: 32 }, (_, index) => ({
	id: index,
	left: `${6 + ((index * 29) % 88)}%`,
	delay: (index % 8) * 0.045,
	duration: 1.15 + (index % 5) * 0.13,
	drift: ((index * 17) % 90) - 45,
	rotation: 130 + ((index * 47) % 280),
	color: ["#ffdd00", "#fff6c2", "#d7a928", "#ffffff"][index % 4],
}));

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
			{completion ? (
				<div className="bonus-confetti" aria-hidden="true">
					{confetti.map((piece) => (
						<span
							key={`${completion.awardId}-${piece.id}`}
							className="bonus-confetti__piece"
							style={
								{
									"--confetti-left": piece.left,
									"--confetti-color": piece.color,
									"--confetti-delay": `${piece.delay}s`,
									"--confetti-duration": `${piece.duration}s`,
									"--confetti-drift": `${piece.drift}px`,
									"--confetti-drift-end": `${piece.drift * -0.35}px`,
									"--confetti-rotation": `${piece.rotation}deg`,
									"--confetti-rotation-mid": `${piece.rotation * 0.55}deg`,
								} as CSSProperties
							}
						/>
					))}
				</div>
			) : null}
			<DialogContent className="max-w-md text-center">
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
					<DialogClose
						render={<Link to="/wallet" className={buttonVariants()} />}
					>
						View wallet
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
