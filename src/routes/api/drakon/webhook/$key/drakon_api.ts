import { createFileRoute } from "@tanstack/react-router";

import { handleDrakonWebhook } from "#/server/infra/providers/drakon/drakon.route";

export const Route = createFileRoute("/api/drakon/webhook/$key/drakon_api")({
	server: {
		handlers: {
			POST: async ({ params, request }) =>
				handleDrakonWebhook(request, params.key),
		},
	},
});
