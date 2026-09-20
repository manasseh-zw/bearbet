import { createServerFn } from "@tanstack/react-start";

import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

import { getAdminOverview } from "./overview.query";

export const getAdminOverviewFn = createServerFn({ method: "GET" })
	.middleware([adminAuthMiddleware])
	.handler(() => getAdminOverview());
