import { createServerFn } from "@tanstack/react-start";

import { historyQuerySchema } from "#/lib/schemas/history.schema";
import { playerAuthMiddleware } from "#/server/infra/auth/auth.middleware";

import { getPlayerHistory } from "./history.service";

export const getCurrentPlayerHistory = createServerFn({ method: "GET" })
	.middleware([playerAuthMiddleware])
	.validator(historyQuerySchema)
	.handler(({ context, data }) =>
		getPlayerHistory(context.session.user.id, data),
	);
