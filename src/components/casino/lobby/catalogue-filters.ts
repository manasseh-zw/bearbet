import type { NormalizedGame } from "#/server/infra/providers/provider.types";

export const uncategorizedGameLabel = "Other";

export type CatalogueCategory = {
	id: string;
	label: string;
	value: string;
	count: number;
};

export function normalizeCatalogueCategory(category?: string) {
	return category?.trim() || uncategorizedGameLabel;
}

export function getCatalogueCategories(
	games: readonly Pick<NormalizedGame, "category">[],
): CatalogueCategory[] {
	const counts = new Map<string, number>();

	for (const game of games) {
		const category = normalizeCatalogueCategory(game.category);
		counts.set(category, (counts.get(category) ?? 0) + 1);
	}

	return [...counts.entries()]
		.map(([value, count]) => ({
			id: `category:${value}`,
			label: value,
			value,
			count,
		}))
		.sort(
			(left, right) =>
				right.count - left.count || left.label.localeCompare(right.label),
		);
}
