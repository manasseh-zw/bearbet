import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

import { getCurrentSession } from "./session";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const session = await getCurrentSession();

	if (!session) {
		setResponseStatus(401);
		throw new Error("Unauthorized");
	}

	return next({ context: { session } });
});

export const freshAuthMiddleware = createMiddleware().server(
	async ({ next }) => {
		const session = await getCurrentSession({ disableCookieCache: true });

		if (!session) {
			setResponseStatus(401);
			throw new Error("Unauthorized");
		}

		return next({ context: { session } });
	},
);
