import type { NormalizedGame } from "#/server/infra/providers/provider.types";

export const uncategorizedGameLabel = "Other";

export const catalogueViewConfig = {
	casino: {
		defaultCategory: "Booming",
		featuredCategory: "Playtech",
		priorityCategories: ["Booming", "Evoplay"],
	},
	promotions: {
		defaultCategory: "all",
		maxItems: 100,
		priorityCategories: [
			"Pragmatic",
			"Evoplay",
			"Booming",
			"Playtech",
			"Hacksaw",
			"Spinomenal",
			"Endorphina",
			"Amatic",
		],
		includedCategories: [
			"Pragmatic",
			"Evoplay",
			"Booming",
			"Playtech",
			"Hacksaw",
			"Spinomenal",
			"Endorphina",
			"Amatic",
		],
	},
} as const;

export type CatalogueCategory = {
	id: string;
	label: string;
	value: string;
	count: number;
};

export type CatalogueCategoryOptions = {
	priorityCategories?: readonly string[];
};

export function normalizeCatalogueCategory(category?: string) {
	return category?.trim() || uncategorizedGameLabel;
}

export function orderCatalogueGames<T extends Pick<NormalizedGame, "category">>(
	games: readonly T[],
	priorityCategories: readonly string[] = [],
): T[] {
	const priority = new Map(
		priorityCategories.map((category, index) => [category, index]),
	);

	return [...games].sort((left, right) => {
		const leftPriority = priority.get(
			normalizeCatalogueCategory(left.category),
		);
		const rightPriority = priority.get(
			normalizeCatalogueCategory(right.category),
		);

		if (leftPriority === undefined && rightPriority === undefined) return 0;
		if (leftPriority === undefined) return 1;
		if (rightPriority === undefined) return -1;
		return leftPriority - rightPriority;
	});
}

export function getCatalogueCategories(
	games: readonly Pick<NormalizedGame, "category">[],
	options: CatalogueCategoryOptions = {},
): CatalogueCategory[] {
	const counts = new Map<string, number>();
	const priority = new Map(
		(options.priorityCategories ?? []).map((category, index) => [
			category,
			index,
		]),
	);

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
		.sort((left, right) => {
			const leftPriority = priority.get(left.value);
			const rightPriority = priority.get(right.value);

			if (leftPriority !== undefined || rightPriority !== undefined) {
				if (leftPriority === undefined) return 1;
				if (rightPriority === undefined) return -1;
				if (leftPriority !== rightPriority) {
					return leftPriority - rightPriority;
				}
			}

			return right.count - left.count || left.label.localeCompare(right.label);
		});
}
