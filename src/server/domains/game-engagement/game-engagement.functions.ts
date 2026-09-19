import { createServerFn } from "@tanstack/react-start";

import { setPlayerGameFavoriteInputSchema } from "#/lib/schemas/game-engagement.schema";
import {
	getPlayerGameEngagement,
	setPlayerGameFavorite,
} from "./game-engagement.service";
import { playerAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const getCurrentPlayerGameEngagement = createServerFn({ method: "GET" })
	.middleware([playerAuthMiddleware])
	.handler(({ context }) => getPlayerGameEngagement(context.session.user.id));

export const setCurrentPlayerGameFavorite = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(setPlayerGameFavoriteInputSchema)
	.handler(({ context, data }) =>
		setPlayerGameFavorite({ ...data, playerId: context.session.user.id }),
	);
