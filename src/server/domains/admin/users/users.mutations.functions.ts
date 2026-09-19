import { createServerFn } from "@tanstack/react-start";

import {
	activateUserInputSchema,
	adjustUserBalanceInputSchema,
	assignUserBonusInputSchema,
	suspendUserInputSchema,
} from "#/lib/schemas/admin-user.schema";
import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

import {
	activateAdminUser,
	adjustAdminUserBalance,
	assignAdminUserBonus,
	suspendAdminUser,
} from "./users.service";

export const suspendAdminUserFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(suspendUserInputSchema)
	.handler(({ context, data }) =>
		suspendAdminUser({ ...data, actorUserId: context.session.user.id }),
	);

export const activateAdminUserFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(activateUserInputSchema)
	.handler(({ context, data }) =>
		activateAdminUser({ ...data, actorUserId: context.session.user.id }),
	);

export const adjustAdminUserBalanceFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(adjustUserBalanceInputSchema)
	.handler(({ context, data }) =>
		adjustAdminUserBalance({ ...data, actorUserId: context.session.user.id }),
	);

export const assignAdminUserBonusFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(assignUserBonusInputSchema)
	.handler(({ context, data }) =>
		assignAdminUserBonus({ ...data, actorUserId: context.session.user.id }),
	);
