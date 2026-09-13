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

export const playerAuthMiddleware = createMiddleware().server(
	async ({ next }) => {
		const session = await getCurrentSession({ disableCookieCache: true });

		if (!session) {
			setResponseStatus(401);
			throw new Error("Unauthorized");
		}
		if (session.user.role !== "user" || session.user.banned) {
			setResponseStatus(403);
			throw new Error("Forbidden");
		}

		return next({ context: { session } });
	},
);

export const adminAuthMiddleware = createMiddleware().server(
	async ({ next }) => {
		const session = await getCurrentSession();

		if (!session) {
			setResponseStatus(401);
			throw new Error("Unauthorized");
		}
		if (session.user.role !== "admin" || session.user.banned) {
			setResponseStatus(403);
			throw new Error("Forbidden");
		}

		return next({ context: { session } });
	},
);
