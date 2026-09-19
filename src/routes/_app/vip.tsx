import { createFileRoute } from "@tanstack/react-router";

import { VipPage } from "#/components/casino/vip/vip-page";

export const Route = createFileRoute("/_app/vip")({
	head: () => ({ meta: [{ title: "VIP club | BearBet" }] }),
	component: VipPage,
});
