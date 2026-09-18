import { createFileRoute } from "@tanstack/react-router";

import { captureBigBangCallback } from "#/server/infra/providers/bigbang/bigbang.capture";
import {
	BigBangWebhookError,
	parseBigBangWebhookCapture,
} from "#/server/infra/providers/bigbang/bigbang.webhook";

export const Route = createFileRoute("/api/bigbang/webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const receivedAt = new Date().toISOString();
				try {
					const webhook = await parseBigBangWebhookCapture(request);
					await captureBigBangCallback({
						kind: "event_webhook",
						receivedAt,
						event: webhook.event,
						sandbox: webhook.sandbox,
						payload: webhook.payload,
						signatureHeaders: webhook.signatureHeaders,
						validation: "captured_unverified",
						responseStatus: 200,
					});

					console.info("BigBang event webhook captured", {
						event: webhook.event,
						sandbox: webhook.sandbox,
					});
					return json({ received: true });
				} catch (error) {
					if (error instanceof BigBangWebhookError) {
						return json({ error: "INVALID_REQUEST" }, { status: error.status });
					}
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
