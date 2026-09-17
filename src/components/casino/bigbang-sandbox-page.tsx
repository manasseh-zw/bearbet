"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	ExternalLinkIcon,
	LoaderCircleIcon,
	PlayIcon,
	RefreshCwIcon,
} from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import {
	getBigBangSandboxGames,
	launchBigBangSandboxDemo,
} from "#/server/domains/game/bigbang-sandbox.functions";

export function BigBangSandboxPage() {
	const games = useQuery({
		queryKey: ["bigbang", "sandbox-games"],
		queryFn: () => getBigBangSandboxGames(),
	});
	const launch = useMutation({
		mutationFn: (gameId: number) =>
			launchBigBangSandboxDemo({ data: { gameId } }),
	});

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
			<header className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<Link
						to="/"
						className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}
					>
						<ArrowLeftIcon /> Casino
					</Link>
					<h1 className="mt-2 font-logo text-3xl sm:text-4xl">
						BigBang sandbox
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Temporary provider launch check. Demo play uses BigBang virtual
						funds only.
					</p>
				</div>
				<Badge variant="outline">No BearBet wallet activity</Badge>
			</header>

			{launch.data ? (
				<section className="mb-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
						<div>
							<p className="font-semibold">{launch.data.gameName}</p>
							<p className="text-sm text-muted-foreground">
								Demo session ready · Game #{launch.data.gameId}
							</p>
						</div>
						<a
							href={launch.data.url}
							target="_blank"
							rel="noreferrer"
							className={buttonVariants({ variant: "outline" })}
						>
							<ExternalLinkIcon /> Open in new tab
						</a>
					</div>
					<iframe
						title={`${launch.data.gameName} demo game`}
						src={launch.data.url}
						className="h-[720px] w-full bg-background"
						allow="autoplay; fullscreen"
						allowFullScreen
					/>
				</section>
			) : null}

			<section>
				<div className="mb-3 flex items-center justify-between gap-3">
					<h2 className="font-logo text-2xl">Available sandbox games</h2>
					<Button
						variant="outline"
						size="sm"
						onClick={() => games.refetch()}
						disabled={games.isFetching}
					>
						<RefreshCwIcon className={cn(games.isFetching && "animate-spin")} />{" "}
						Refresh
					</Button>
				</div>
				{games.isPending ? <LoadingGames /> : null}
				{games.isError ? (
					<p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
						{message(games.error)}
					</p>
				) : null}
				{games.data ? (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{games.data.map((game) => (
							<Card key={game.id} className="overflow-hidden">
								{game.thumbnail ? (
									<img
										src={game.thumbnail}
										alt=""
										className="aspect-video w-full object-cover"
									/>
								) : (
									<div className="aspect-video bg-muted" />
								)}
								<CardHeader className="gap-2 pb-3">
									<CardTitle className="text-lg">{game.title}</CardTitle>
									<p className="text-sm text-muted-foreground">
										{game.provider} · {game.game_type} · #{game.id}
									</p>
								</CardHeader>
								<CardContent>
									<Button
										className="w-full"
										onClick={() => launch.mutate(game.id)}
										disabled={launch.isPending}
									>
										{launch.isPending && launch.variables === game.id ? (
											<LoaderCircleIcon className="animate-spin" />
										) : (
											<PlayIcon />
										)}
										Launch demo
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				) : null}
				{launch.isError ? (
					<p className="mt-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
						{message(launch.error)}
					</p>
				) : null}
			</section>
		</main>
	);
}

function LoadingGames() {
	return (
		<div className="grid min-h-52 place-items-center rounded-xl border">
			<LoaderCircleIcon className="animate-spin text-primary" />
		</div>
	);
}

function message(error: Error) {
	return error.message || "The sandbox request failed.";
}
