import { createServerFn } from "@tanstack/react-start";

import {
	closeDemoGameInputSchema,
	playDemoGameInputSchema,
	startDemoGameInputSchema,
} from "#/lib/schemas/gameplay.schema";
import {
	closeCurrentPlayerGame as closeCurrentPlayerGameService,
	closeDemoGame,
	playDemoGame,
	startCurrentPlayerGame as startCurrentPlayerGameService,
	startDemoGame,
} from "#/server/domains/gameplay/demo-game.service";
import { playerAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const startCurrentPlayerDemoGame = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(startDemoGameInputSchema)
	.handler(({ context, data }) =>
		startDemoGame({ ...data, playerId: context.session.user.id }),
	);

export const startCurrentPlayerGame = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(startDemoGameInputSchema)
	.handler(({ context, data }) =>
		startCurrentPlayerGameService({
			...data,
			playerId: context.session.user.id,
			userName: context.session.user.name,
		}),
	);

export const playCurrentPlayerDemoGame = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(playDemoGameInputSchema)
	.handler(({ context, data }) =>
		playDemoGame({ ...data, playerId: context.session.user.id }),
	);

export const closeCurrentPlayerDemoGame = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(closeDemoGameInputSchema)
	.handler(({ context, data }) =>
		closeDemoGame({ ...data, playerId: context.session.user.id }),
	);

export const closeCurrentPlayerGame = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(closeDemoGameInputSchema)
	.handler(({ context, data }) =>
		closeCurrentPlayerGameService({
			...data,
			playerId: context.session.user.id,
		}),
	);
