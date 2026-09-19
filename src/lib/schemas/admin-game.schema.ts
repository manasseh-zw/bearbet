import { z } from "zod";

import { adminPageSchema, adminPageSizeSchema } from "./admin-query.schema";

export const adminGameAvailability = [
	"all",
	"available",
	"unavailable",
] as const;
export const adminGameStatuses = ["all", "enabled", "disabled"] as const;
export const adminGameCuration = ["all", "featured", "popular", "new"] as const;
export const adminGameSortFields = ["name", "lastSeenAt", "updatedAt"] as const;
export const adminGameSortDirections = ["asc", "desc"] as const;

export const adminGameQuerySchema = z
	.object({
		page: adminPageSchema.default(1),
		pageSize: adminPageSizeSchema.default(24),
		search: z.string().trim().max(100).default(""),
		provider: z.string().trim().max(120).default(""),
		availability: z.enum(adminGameAvailability).default("all"),
		status: z.enum(adminGameStatuses).default("all"),
		curation: z.enum(adminGameCuration).default("all"),
		sort: z.enum(adminGameSortFields).default("name"),
		direction: z.enum(adminGameSortDirections).default("asc"),
	})
	.strict();

const reasonSchema = z.string().trim().min(1, "A reason is required").max(500);

export const updateAdminGameInputSchema = z
	.object({
		gameId: z.string().uuid(),
		reason: reasonSchema,
		isEnabled: z.boolean().optional(),
		category: z.string().trim().max(120).nullable().optional(),
		isFeatured: z.boolean().optional(),
		isPopular: z.boolean().optional(),
		isNew: z.boolean().optional(),
	})
	.strict()
	.refine(
		(input) =>
			input.isEnabled !== undefined ||
			input.category !== undefined ||
			input.isFeatured !== undefined ||
			input.isPopular !== undefined ||
			input.isNew !== undefined,
		{ message: "Choose a game setting to change" },
	);

export const syncAdminGamesInputSchema = z
	.object({ reason: reasonSchema })
	.strict();

export type AdminGameQuery = z.output<typeof adminGameQuerySchema>;
export type AdminGameAvailability = (typeof adminGameAvailability)[number];
export type AdminGameStatuses = (typeof adminGameStatuses)[number];
export type AdminGameCuration = (typeof adminGameCuration)[number];
export type AdminGameSortFields = (typeof adminGameSortFields)[number];
export type UpdateAdminGameInput = z.input<typeof updateAdminGameInputSchema>;
export type SyncAdminGamesInput = z.input<typeof syncAdminGamesInputSchema>;
