import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/casino/route-placeholder";

export const Route = createFileRoute("/_casino/vip")({
	head: () => ({ meta: [{ title: "VIP club | BearBet" }] }),
	component: VipPage,
});

function VipPage() {
	return (
		<RoutePlaceholder
			title="VIP club"
			description="VIP rewards and membership details will live here."
		/>
	);
}
