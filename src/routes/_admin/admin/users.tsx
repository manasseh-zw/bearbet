import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "#/components/admin/users/users-page";
import { adminUserQuerySchema } from "#/lib/schemas/admin-query.schema";

export const Route = createFileRoute("/_admin/admin/users")({
	validateSearch: (search) => {
		const parsed = adminUserQuerySchema.safeParse(search);
		return parsed.success ? parsed.data : adminUserQuerySchema.parse({});
	},
	head: () => ({ meta: [{ title: "Users | BearBet Admin" }] }),
	component: UsersAdminPage,
});

function UsersAdminPage() {
	const query = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<UsersPage
			query={query}
			onQueryChange={(search) =>
				navigate({ search, replace: true, resetScroll: false })
			}
		/>
	);
}
