import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getPlayableBalance } from "#/server/domains/wallet/wallet.service";
import { getBigBangEnv } from "#/server/env";
import { captureBigBangCallback } from "#/server/infra/providers/bigbang/bigbang.capture";

const querySchema = z.object({ username: z.string().min(1).max(255) });

export const Route = createFileRoute("/api/bigbang/user-data")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const receivedAt = new Date().toISOString();
				const config = getBigBangEnv();
				const parsed = querySchema.safeParse(
					Object.fromEntries(new URL(request.url).searchParams),
				);
				if (!parsed.success) {
					if (config.sandboxKey.startsWith("ek_test_")) {
						await captureBigBangCallback({
							kind: "user_data",
							receivedAt,
							validation: "invalid",
							responseStatus: 400,
						});
					}
					return json({ error: "invalid username" }, { status: 400 });
				}

				if (config.sandboxKey.startsWith("ek_test_")) {
					await captureBigBangCallback({
						kind: "user_data",
						receivedAt,
						username: parsed.data.username,
						validation: "accepted",
						responseStatus: 200,
						response: { balance: "100000.00", currency: "USD" },
					});
					console.info("BigBang sandbox user_data callback", {
						username: parsed.data.username,
					});
					return json({
						username: parsed.data.username,
						balance: "100000.00",
						currency: "USD",
					});
				}

				try {
					const wallet = await getPlayableBalance(parsed.data.username);
					return json({
						username: parsed.data.username,
						balance: minorToMajor(wallet.balanceMinor),
						currency: wallet.currencyCode,
					});
				} catch {
					return json({ error: "unknown user" }, { status: 404 });
				}
			},
		},
	},
});

function minorToMajor(amountMinor: number) {
	return (amountMinor / 100).toFixed(2);
}

function json(body: Record<string, unknown>, init?: ResponseInit) {
	return Response.json(body, {
		...init,
		headers: { "Cache-Control": "no-store", ...init?.headers },
	});
}
