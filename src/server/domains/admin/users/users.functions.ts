import { createServerFn } from "@tanstack/react-start";

import { adminUserQuerySchema } from "#/lib/schemas/admin-query.schema";
import { listActiveBonusDefinitions } from "#/server/domains/bonus/bonus.service";
import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

import { listAdminUsers } from "./users.query";

export const listAdminUsersFn = createServerFn({ method: "GET" })
	.middleware([adminAuthMiddleware])
	.validator(adminUserQuerySchema)
	.handler(({ data }) => listAdminUsers(data));

export const listAdminBonusDefinitionsFn = createServerFn({ method: "GET" })
	.middleware([adminAuthMiddleware])
	.handler(() => listActiveBonusDefinitions());
