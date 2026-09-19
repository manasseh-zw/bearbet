import { z } from "zod";

export const adminUserStatuses = ["all", "active", "suspended"] as const;
export const adminUserRoles = ["all", "admin", "user"] as const;
export const adminUserSortFields = ["createdAt", "name", "email"] as const;
export const adminSortDirections = ["asc", "desc"] as const;

export const adminPageSchema = z.coerce.number().int().positive().max(10_000);
export const adminPageSizeSchema = z.coerce.number().int().positive().max(100);
export const adminCursorSchema = z.string().trim().min(1).max(512);

export const adminCursorQuerySchema = z
	.object({
		cursor: adminCursorSchema.optional(),
		limit: adminPageSizeSchema.default(50),
	})
	.strict();

export const adminUserQuerySchema = z
	.object({
		page: adminPageSchema.default(1),
		pageSize: adminPageSizeSchema.default(20),
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
export type AdminCursorQuery = z.output<typeof adminCursorQuerySchema>;

export type AdminOffsetPage = {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

export type AdminCursorPage = {
	hasMore: boolean;
	nextCursor: string | null;
};
