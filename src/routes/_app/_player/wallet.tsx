import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/casino/route-placeholder";

export const Route = createFileRoute("/_app/_player/wallet")({
	head: () => ({ meta: [{ title: "Wallet | BearBet" }] }),
	component: WalletPage,
});

function WalletPage() {
	return <RoutePlaceholder title="Wallet" />;
}
