import { createFileRoute } from "@tanstack/react-router";
import { catalogueViewConfig } from "#/components/casino/lobby/catalogue-filters";
import { GameCatalogue } from "#/components/casino/lobby/game-catalogue";
import {
	catalogueRouteSearchSchema,
	normalizeCatalogueRouteSearch,
} from "#/lib/schemas/catalogue.schema";

export const Route = createFileRoute("/_app/promotions")({
	validateSearch: (search) => {
		const parsed = catalogueRouteSearchSchema.safeParse(search);
		return parsed.success ? parsed.data : {};
	},
	head: () => ({ meta: [{ title: "Promotions | BearBet" }] }),
	component: PromotionsPage,
});

function PromotionsPage() {
	const query = normalizeCatalogueRouteSearch(Route.useSearch());
	const navigate = Route.useNavigate();

	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
			<GameCatalogue
				query={query}
				onQueryChange={(search) => navigate({ search, replace: true })}
				scope="promotions"
				priorityCategories={catalogueViewConfig.promotions.priorityCategories}
				eyebrow="Selected providers"
				title="Promotions"
				topMargin="mt-0"
			/>
		</main>
	);
}
