import { createFileRoute } from "@tanstack/react-router";

import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_app/promotions")({
	head: () => ({ meta: [{ title: "Promotions | BearBet" }] }),
	component: PromotionsPage,
});

function PromotionsPage() {
	return <RoutePlaceholder title="Promotions" />;
}
