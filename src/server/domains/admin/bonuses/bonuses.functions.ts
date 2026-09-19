import { createServerFn } from "@tanstack/react-start";

import {
	adminBonusQuerySchema,
	createAdminBonusDefinitionInputSchema,
	setAdminBonusDefinitionStatusInputSchema,
	updateAdminBonusDefinitionInputSchema,
} from "#/lib/schemas/admin-bonus.schema";
import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

import { listAdminBonusDefinitions } from "./bonuses.query";
import {
	createAdminBonusDefinition,
	setAdminBonusDefinitionStatus,
	updateAdminBonusDefinition,
} from "./bonuses.service";

export const listAdminBonusDefinitionsFn = createServerFn({ method: "GET" })
	.middleware([adminAuthMiddleware])
	.validator(adminBonusQuerySchema)
	.handler(({ data }) => listAdminBonusDefinitions(data));

export const createAdminBonusDefinitionFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(createAdminBonusDefinitionInputSchema)
	.handler(({ context, data }) =>
		createAdminBonusDefinition({
			...data,
			actorUserId: context.session.user.id,
		}),
	);

export const updateAdminBonusDefinitionFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(updateAdminBonusDefinitionInputSchema)
	.handler(({ context, data }) =>
		updateAdminBonusDefinition({
			...data,
			actorUserId: context.session.user.id,
		}),
	);

export const setAdminBonusDefinitionStatusFn = createServerFn({
	method: "POST",
})
	.middleware([adminAuthMiddleware])
	.validator(setAdminBonusDefinitionStatusInputSchema)
	.handler(({ context, data }) =>
		setAdminBonusDefinitionStatus({
			...data,
			actorUserId: context.session.user.id,
		}),
	);
