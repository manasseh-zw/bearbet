import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

export type GameCardGame = {
	id: string;
	name: string;
	provider: string;
	category?: string;
	type?: string;
	imageUrl?: string;
};

type GameCardProps = {
	game: GameCardGame;
	compact?: boolean;
	playable?: boolean;
};

export function GameCard({
	game,
	compact = false,
	playable = false,
}: GameCardProps) {
	const content = (
		<>
			<span
				className={`relative block overflow-hidden rounded-xl border border-white/8 bg-card transition duration-200 ease-out group-hover:-translate-y-1 group-hover:border-primary/80 group-focus-within:-translate-y-1 group-focus-within:border-primary/80 motion-reduce:transform-none ${compact ? "aspect-[5/6]" : "aspect-[4/5]"}`}
			>
				{game.imageUrl ? (
					<img
						src={game.imageUrl}
						alt=""
						loading="lazy"
						decoding="async"
						className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035] group-focus-within:scale-[1.035] motion-reduce:transform-none"
					/>
				) : (
					<span className="grid size-full place-items-center bg-linear-to-br from-card to-muted px-4 text-center font-logo text-xl text-muted-foreground">
						{game.name}
					</span>
				)}
				<span className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/75 to-transparent" />
				<span className="absolute right-2 bottom-2 flex items-center gap-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
					Play <ArrowRightIcon className="size-3.5" />
				</span>
			</span>
			<span className="mt-2 block truncate text-sm font-medium text-foreground">
				{game.name}
			</span>
			<span className="mt-0.5 block truncate text-xs capitalize text-muted-foreground">
				{game.category ?? game.provider}
				{game.category && game.category !== game.provider
					? ` · ${game.provider}`
					: ""}
				{game.type ? ` · ${game.type.replaceAll("game", " game")}` : ""}
			</span>
		</>
	);

	return (
		<article className="group min-w-0">
			{playable ? (
				<Link
					to="/games/$gameId"
					params={{ gameId: game.id }}
					aria-label={`Play ${game.name}`}
					className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				>
					{content}
				</Link>
			) : (
				<button
					type="button"
					aria-label={`Sign in to play ${game.name}`}
					className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				>
					{content}
				</button>
			)}
		</article>
	);
}
