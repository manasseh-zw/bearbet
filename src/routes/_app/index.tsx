import { createFileRoute } from "@tanstack/react-router";

import { AuthenticatedLobby } from "#/components/casino/authenticated/authenticated-lobby";
import { GuestLobby } from "#/components/casino/guest/guest-lobby";
import { Skeleton } from "#/components/ui/skeleton";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_app/")({
	component: CasinoLobby,
});

const lobbySkeletonKeys = Array.from(
	{ length: 6 },
	(_, index) => `lobby-skeleton-${index + 1}`,
);

function CasinoLobby() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
				<Skeleton className="h-10 w-64" />
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					{lobbySkeletonKeys.map((key) => (
						<Skeleton key={key} className="aspect-[5/6] rounded-xl" />
					))}
				</div>
			</main>
		);
	}

	return session?.user ? <AuthenticatedLobby /> : <GuestLobby />;
}
