import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import {
	BigBangWalletError,
	parseBigBangBalanceChange,
} from "#/server/infra/providers/bigbang/bigbang.wallet";

const apiKey = "ek_test_bigbang-wallet-secret";

test("BigBang balance changes verify the signature and preserve signed minor units", async () => {
	const body = signedBody({ amount: "-2.50", sandbox: true });
	const parsed = await parseBigBangBalanceChange(request(body), apiKey);

	assert.equal(parsed.amountMinor, -250);
	assert.equal(parsed.transaction_id, "transaction-1");
	assert.equal(parsed.round_id, "round-1");
	assert.equal(parsed.type, "round");
	assert.equal(parsed.sandbox, true);
});

test("BigBang balance changes reject invalid signatures and amounts", async () => {
	await assert.rejects(
		parseBigBangBalanceChange(
			request({ ...signedBody({ amount: 1 }), signature: "0".repeat(64) }),
			apiKey,
		),
		(error) =>
			error instanceof BigBangWalletError &&
			error.status === 401 &&
			error.code === "UNAUTHORIZED",
	);

	const invalidAmount = signedBody({ amount: "1.234" });
	await assert.rejects(
		parseBigBangBalanceChange(request(invalidAmount), apiKey),
		(error) => error instanceof BigBangWalletError && error.status === 400,
	);
});

function signedBody(overrides: Record<string, unknown> = {}) {
	const body = {
		username: "player-1",
		amount: "-2.50",
		game: "SGHotHotFruit",
		game_category: "Habanero",
		transaction_id: "transaction-1",
		round_id: "round-1",
		type: "round",
		game_id: 4821,
		provider_id: "Habanero",
		sandbox: true,
		...overrides,
	};
	return {
		...body,
		signature: createHmac("sha256", apiKey)
			.update(
				`${body.username}${body.amount}${body.game}${body.game_category}${body.transaction_id}`,
			)
			.digest("hex"),
	};
}

function request(body: unknown) {
	return new Request("https://bearbet.test/api/bigbang/balance-change", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}
