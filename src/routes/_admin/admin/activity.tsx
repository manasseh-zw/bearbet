import { createFileRoute } from "@tanstack/react-router";

import { ActivityPage } from "#/components/admin/operations/activity-page";
import { adminActivityQuerySchema } from "#/lib/schemas/admin-operations.schema";

export const Route = createFileRoute("/_admin/admin/activity")({
	validateSearch: (search) => {
		const parsed = adminActivityQuerySchema.safeParse(search);
		return parsed.success ? parsed.data : adminActivityQuerySchema.parse({});
	},
	head: () => ({ meta: [{ title: "Activity | BearBet Admin" }] }),
	component: ActivityRoute,
});

function ActivityRoute() {
	const query = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<ActivityPage
			query={query}
			onQueryChange={(search) =>
				navigate({ search, replace: true, resetScroll: false })
			}
		/>
	);
}
