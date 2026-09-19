import { createServerFn } from "@tanstack/react-start";

import { catalogueSearchSchema } from "#/lib/schemas/catalogue.schema";

import {
	listGames,
	searchGames,
	syncGameCatalogue,
} from "#/server/domains/game/game.service";
import { env } from "#/server/env";
import { adminAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const getGames = createServerFn({ method: "GET" }).handler(() =>
	listGames(),
);

export const searchCatalogue = createServerFn({ method: "GET" })
	.validator(catalogueSearchSchema)
	.handler(({ data }) => searchGames(data));

export const syncGames = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.handler(() =>
		syncGameCatalogue({ integrationProvider: env.CASINO_PROVIDER }),
	);
