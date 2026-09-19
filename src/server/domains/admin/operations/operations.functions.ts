import { createServerFn } from "@tanstack/react-start";

import {
	adminActivityQuerySchema,
	adminWithdrawalQuerySchema,
} from "#/lib/schemas/admin-operations.schema";
import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

import { listAdminActivity, listAdminWithdrawals } from "./operations.query";

export const listAdminWithdrawalsFn = createServerFn({ method: "GET" })
	.middleware([adminAuthMiddleware])
	.validator(adminWithdrawalQuerySchema)
	.handler(({ data }) => listAdminWithdrawals(data));

export const listAdminActivityFn = createServerFn({ method: "GET" })
	.middleware([adminAuthMiddleware])
	.validator(adminActivityQuerySchema)
	.handler(({ data }) => listAdminActivity(data));
