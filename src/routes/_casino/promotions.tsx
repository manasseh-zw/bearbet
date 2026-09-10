import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/casino/route-placeholder";

export const Route = createFileRoute("/_casino/promotions")({
	head: () => ({ meta: [{ title: "Promotions | BearBet" }] }),
	component: PromotionsPage,
});

function PromotionsPage() {
	return (
		<RoutePlaceholder
			title="Promotions"
			description="Promotional campaigns will live here."
		/>
	);
}
