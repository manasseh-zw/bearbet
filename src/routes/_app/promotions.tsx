import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { catalogueViewConfig } from "#/components/casino/lobby/catalogue-filters";
import { GameCatalogue } from "#/components/casino/lobby/game-catalogue";
import { catalogueQueries } from "#/lib/queries/catalogue.queries";

export const Route = createFileRoute("/_app/promotions")({
	head: () => ({ meta: [{ title: "Promotions | BearBet" }] }),
	component: PromotionsPage,
});

function PromotionsPage() {
	const catalogue = useQuery(catalogueQueries.games());
	const games = useMemo(
		() => catalogue.data?.filter((game) => game.isAvailable) ?? [],
		[catalogue.data],
	);

	return (
		<main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
			<GameCatalogue
				games={games}
				isPending={catalogue.isPending}
				isError={catalogue.isError}
				onRetry={() => catalogue.refetch()}
				defaultCategory={catalogueViewConfig.promotions.defaultCategory}
				maxItems={catalogueViewConfig.promotions.maxItems}
				priorityCategories={catalogueViewConfig.promotions.priorityCategories}
				includedCategories={catalogueViewConfig.promotions.includedCategories}
				eyebrow="Selected providers"
				title="Promotions"
				topMargin="mt-0"
			/>
		</main>
	);
}
