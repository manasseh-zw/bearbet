import { z } from "zod";

export const catalogueScopes = ["casino", "promotions"] as const;

export const promotionCatalogueCategories = [
	"Pragmatic",
	"Evoplay",
	"Booming",
	"Playtech",
	"Hacksaw",
	"Spinomenal",
	"Endorphina",
	"Amatic",
] as const;

export const catalogueScopePriorityCategories = {
	casino: ["Booming", "Evoplay"],
	promotions: promotionCatalogueCategories,
} as const;

export const catalogueSearchSchema = z.object({
	q: z.string().trim().max(80).default(""),
	category: z.string().trim().min(1).max(120).optional(),
	scope: z.enum(catalogueScopes).default("casino"),
	page: z.coerce.number().int().positive().max(1_000).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(48),
});

export const catalogueRouteSearchSchema = z.object({
	q: z.string().trim().max(80).optional(),
	category: z.string().trim().min(1).max(120).optional(),
	page: z.coerce.number().int().positive().max(1_000).optional(),
});

export type CatalogueSearch = z.output<typeof catalogueSearchSchema>;
export type CatalogueRouteSearch = {
	q: string;
	category?: string;
	page: number;
};

export function normalizeCatalogueRouteSearch(
	value: z.output<typeof catalogueRouteSearchSchema>,
): CatalogueRouteSearch {
	return { q: value.q ?? "", category: value.category, page: value.page ?? 1 };
}
