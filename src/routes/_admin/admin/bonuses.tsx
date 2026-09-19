import { createFileRoute } from "@tanstack/react-router";

import { BonusDefinitionsPage } from "#/components/admin/bonuses/bonus-definitions-page";
import { adminBonusQuerySchema } from "#/lib/schemas/admin-bonus.schema";

export const Route = createFileRoute("/_admin/admin/bonuses")({
	validateSearch: (search) => {
		const parsed = adminBonusQuerySchema.partial().safeParse(search);
		return parsed.success ? parsed.data : {};
	},
	head: () => ({ meta: [{ title: "Bonuses | BearBet Admin" }] }),
	component: BonusesAdminPage,
});

function BonusesAdminPage() {
	const query = adminBonusQuerySchema.parse(Route.useSearch());
	const navigate = Route.useNavigate();

	return (
		<BonusDefinitionsPage
			query={query}
			onQueryChange={(search) =>
				navigate({ search, replace: true, resetScroll: false })
			}
		/>
	);
}
