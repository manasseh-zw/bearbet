import { createFileRoute } from "@tanstack/react-router";

import { WalletPage } from "#/components/wallet/wallet-page";

export const Route = createFileRoute("/_app/_player/wallet")({
	head: () => ({ meta: [{ title: "Wallet | BearBet" }] }),
	component: WalletPage,
});
