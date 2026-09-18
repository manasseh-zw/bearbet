import { createFileRoute } from "@tanstack/react-router";

import { getBigBangEnv } from "#/server/env";
import {
	captureBigBangCallback,
	redactBigBangPayload,
} from "#/server/infra/providers/bigbang/bigbang.capture";
import {
	BigBangWalletError,
	parseBigBangBalanceChange,
} from "#/server/infra/providers/bigbang/bigbang.wallet";

export const Route = createFileRoute("/api/bigbang/balance-change")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const receivedAt = new Date().toISOString();
				const rawBody = await request.clone().text();
				const config = getBigBangEnv();
				try {
					const change = await parseBigBangBalanceChange(
						request,
						config.sandboxKey,
					);

					console.info("BigBang balance_change callback", {
						username: change.username,
						amount: change.amount,
						amountMinor: change.amountMinor,
						game: change.game,
						gameCategory: change.game_category,
						transactionId: change.transaction_id,
						roundId: change.round_id,
						type: change.type,
						gameId: change.game_id,
						providerId: change.provider_id,
						sandbox: change.sandbox ?? false,
					});

					if (change.sandbox) {
						await captureBigBangCallback({
							kind: "balance_change",
							receivedAt,
							payload: redactBigBangPayload(rawBody),
							amountMinor: change.amountMinor,
							validation: "accepted",
							responseStatus: 200,
							response: { status: "ok", balance: "100000.00" },
						});
						return json({ status: "ok", balance: "100000.00" });
					}

					return json(
						{ error: "live BigBang wallet changes are not enabled" },
						{ status: 503 },
					);
				} catch (error) {
					if (config.sandboxKey.startsWith("ek_test_")) {
						await captureBigBangCallback({
							kind: "balance_change",
							receivedAt,
							payload: redactBigBangPayload(rawBody),
							validation:
								error instanceof BigBangWalletError
									? error.code
									: "INTERNAL_ERROR",
							responseStatus:
								error instanceof BigBangWalletError ? error.status : 500,
						});
					}
					if (error instanceof BigBangWalletError) {
						return json({ error: error.code }, { status: error.status });
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
