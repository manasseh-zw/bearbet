import { createFileRoute } from "@tanstack/react-router";

import {
	GameplayServiceError,
	processProviderCallback,
} from "#/server/domains/gameplay/gameplay.service";
import { getDrakonEnv } from "#/server/env";
import {
	DrakonWebhookError,
	parseDrakonWebhook,
} from "#/server/infra/providers/drakon/drakon.webhook";

export const Route = createFileRoute("/api/drakon/$key")({
	server: {
		handlers: {
			POST: async ({ params, request }) => {
				try {
					const callback = await parseDrakonWebhook(
						request,
						params.key,
						getDrakonEnv(),
					);
					const result = await processProviderCallback(callback, {
						integrationProvider: "drakon",
					});
					if (callback.isDashboardProbe) {
						return json({ status: true, balance: 1000 });
					}
					if (callback.kind === "accountDetails") {
						if (!("email" in result) || !("name" in result)) {
							return json({ status: false, error: "INVALID_USER" });
						}
						return json({
							status: true,
							email: result.email,
							name_jogador: result.name,
							date: new Date().toISOString(),
						});
					}
					return json({
						status: callback.kind === "balance" ? 1 : true,
						balance: minorToMajor(result.balanceMinor),
					});
				} catch (error) {
					if (error instanceof DrakonWebhookError) {
						return json(
							{ status: false, error: error.code },
							{ status: error.status },
						);
					}
					if (error instanceof GameplayServiceError) {
						return json({ status: false, error: error.code });
					}
					return json(
						{ status: false, error: "INTERNAL_ERROR" },
						{ status: 500 },
					);
				}
			},
		},
	},
});

function minorToMajor(amountMinor: number) {
	return amountMinor / 100;
}

function json(body: Record<string, unknown>, init?: ResponseInit) {
	return Response.json(body, {
		...init,
		headers: { "Cache-Control": "no-store", ...init?.headers },
	});
}
