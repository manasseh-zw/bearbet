import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_admin/admin/withdrawals")({
	head: () => ({ meta: [{ title: "Withdrawals | BearBet Admin" }] }),
	component: WithdrawalsAdminPage,
});

function WithdrawalsAdminPage() {
	return (
		<RoutePlaceholder
			description="Review pending simulated withdrawals and inspect completed decisions."
			title="Withdrawals"
		/>
	);
}
