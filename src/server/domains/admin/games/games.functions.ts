import { createServerFn } from "@tanstack/react-start";

import {
	adminGameQuerySchema,
	syncAdminGamesInputSchema,
	updateAdminGameInputSchema,
} from "#/lib/schemas/admin-game.schema";
import { env } from "#/server/env";
import { listAdminGames } from "./games.query";
import { updateAdminGame } from "./games.service";
import { syncGameCatalogue } from "#/server/domains/game/game.service";
import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const listAdminGamesFn = createServerFn({ method: "GET" })
	.middleware([adminAuthMiddleware])
	.validator(adminGameQuerySchema)
	.handler(({ data }) => listAdminGames(data));

export const updateAdminGameFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(updateAdminGameInputSchema)
	.handler(({ context, data }) =>
		updateAdminGame({ ...data, actorUserId: context.session.user.id }),
	);

export const syncAdminGamesFn = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(syncAdminGamesInputSchema)
	.handler(({ context, data }) =>
		syncGameCatalogue({
			integrationProvider: env.CASINO_PROVIDER,
			audit: { actorUserId: context.session.user.id, reason: data.reason },
		}),
	);
