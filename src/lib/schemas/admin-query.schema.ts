import { z } from "zod";

export const adminUserStatuses = ["all", "active", "suspended"] as const;
export const adminUserRoles = ["all", "admin", "user"] as const;
export const adminUserSortFields = ["createdAt", "name", "email"] as const;
export const adminSortDirections = ["asc", "desc"] as const;

export const adminUserQuerySchema = z
	.object({
		page: z.coerce.number().int().positive().max(10_000).default(1),
		pageSize: z.coerce.number().int().positive().max(100).default(20),
		search: z.string().trim().max(100).default(""),
		status: z.enum(adminUserStatuses).default("all"),
		role: z.enum(adminUserRoles).default("all"),
		sort: z.enum(adminUserSortFields).default("createdAt"),
		direction: z.enum(adminSortDirections).default("desc"),
	})
	.strict();

export type AdminUserQuery = z.output<typeof adminUserQuerySchema>;
export type AdminUserStatus = AdminUserQuery["status"];
export type AdminUserRole = AdminUserQuery["role"];
