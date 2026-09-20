import "@tanstack/react-start/server-only";

import { createFileRoute } from "@tanstack/react-router";

import { closeDemoGameInputSchema } from "#/lib/schemas/gameplay.schema";
import {
	closeCurrentPlayerGame,
	DemoGameError,
} from "#/server/domains/gameplay/demo-game.service";
import { getCurrentSession } from "#/server/infra/auth/session";

export const Route = createFileRoute("/api/player/game-session/close")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getCurrentSession({ disableCookieCache: true });
				if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });
				if (session.user.role !== "user" || session.user.banned) {
					return json({ error: "FORBIDDEN" }, { status: 403 });
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return json({ error: "INVALID_REQUEST" }, { status: 400 });
				}

				const parsed = closeDemoGameInputSchema.safeParse(body);
				if (!parsed.success) {
					return json({ error: "INVALID_REQUEST" }, { status: 400 });
				}

				try {
					const result = await closeCurrentPlayerGame({
						...parsed.data,
						playerId: session.user.id,
					});
					return json({ closed: true, ...result });
				} catch (error) {
					if (error instanceof DemoGameError) {
						return json({ error: error.message }, { status: 409 });
					}
					console.error("Player game-session close failed", error);
					return json({ error: "INTERNAL_ERROR" }, { status: 500 });
				}
			},
		},
	},
});

function json(body: Record<string, unknown>, init?: ResponseInit) {
	return Response.json(body, {
		...init,
		headers: { "Cache-Control": "no-store", ...init?.headers },
	});
}
