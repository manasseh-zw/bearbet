import { z } from "zod";
import { adminPageSchema, adminPageSizeSchema } from "./admin-query.schema";
import {
	bonusDefinitionFieldsSchema,
	bonusDefinitionTypes,
	createBonusDefinitionSchema,
	updateBonusDefinitionSchema,
} from "./bonus.schema";

export const adminBonusStatuses = ["all", "active", "inactive"] as const;
export const adminBonusSortFields = ["name", "createdAt", "updatedAt"] as const;
export const adminBonusSortDirections = ["asc", "desc"] as const;

const reasonSchema = z.string().trim().min(1, "A reason is required").max(500);

export const adminBonusQuerySchema = z
	.object({
		page: adminPageSchema.default(1),
		pageSize: adminPageSizeSchema.default(20),
		search: z.string().trim().max(100).default(""),
		status: z.enum(adminBonusStatuses).default("all"),
		type: z.enum(["all", ...bonusDefinitionTypes]).default("all"),
		sort: z.enum(adminBonusSortFields).default("updatedAt"),
		direction: z.enum(adminBonusSortDirections).default("desc"),
	})
	.strict();

export const createAdminBonusDefinitionInputSchema = createBonusDefinitionSchema
	.extend({ reason: reasonSchema })
	.strict();

export const updateAdminBonusDefinitionInputSchema = updateBonusDefinitionSchema
	.extend({ reason: reasonSchema })
	.strict();

export const setAdminBonusDefinitionStatusInputSchema = z
	.object({
		definitionId: z.string().uuid(),
		isActive: z.boolean(),
		reason: reasonSchema,
	})
	.strict();

export type AdminBonusQuery = z.output<typeof adminBonusQuerySchema>;
export type AdminBonusStatus = AdminBonusQuery["status"];
export type AdminBonusType = AdminBonusQuery["type"];
export type AdminBonusSortField = AdminBonusQuery["sort"];
export type AdminBonusSortDirection = AdminBonusQuery["direction"];
export type CreateAdminBonusDefinitionInput = z.input<
	typeof createAdminBonusDefinitionInputSchema
>;
export type UpdateAdminBonusDefinitionInput = z.input<
	typeof updateAdminBonusDefinitionInputSchema
>;
export type SetAdminBonusDefinitionStatusInput = z.input<
	typeof setAdminBonusDefinitionStatusInputSchema
>;

export { bonusDefinitionFieldsSchema, bonusDefinitionTypes };
