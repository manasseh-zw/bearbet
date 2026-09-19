import { createFileRoute } from "@tanstack/react-router";
import { RoutePlaceholder } from "#/components/shared/route-placeholder";

export const Route = createFileRoute("/_admin/admin/users")({
	head: () => ({ meta: [{ title: "Users | BearBet Admin" }] }),
	component: UsersAdminPage,
});

function UsersAdminPage() {
	return (
		<RoutePlaceholder
			description="Search players, inspect virtual balances, manage account status, and assign bonuses."
			title="Users"
		/>
	);
}
