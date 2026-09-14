import { createServerFn } from "@tanstack/react-start";

import { activateBonusInputSchema } from "#/lib/schemas/bonus.schema";
import {
	activateBonusAward,
	getPlayerBonusOverview,
} from "#/server/domains/bonus/bonus.service";
import { playerAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const getCurrentPlayerBonuses = createServerFn({ method: "GET" })
	.middleware([playerAuthMiddleware])
	.handler(({ context }) => getPlayerBonusOverview(context.session.user.id));

export const activateCurrentPlayerBonus = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(activateBonusInputSchema)
	.handler(({ context, data }) =>
		activateBonusAward({ ...data, playerId: context.session.user.id }),
	);
