import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_app/vip")({
	head: () => ({ meta: [{ title: "VIP club | BearBet" }] }),
	component: VipPage,
});

function VipPage() {
	return <RoutePlaceholder title="VIP club" />;
}
