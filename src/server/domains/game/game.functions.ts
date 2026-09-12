import { createServerFn } from "@tanstack/react-start";

import {
	listGames,
	syncGameCatalogue,
} from "#/server/domains/game/game.service";
import { env } from "#/server/env";
import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const getGames = createServerFn({ method: "GET" }).handler(() =>
	listGames(),
);

export const syncGames = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.handler(() =>
		syncGameCatalogue({ integrationProvider: env.CASINO_PROVIDER }),
	);
