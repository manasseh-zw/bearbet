import assert from "node:assert/strict";
import test from "node:test";

import {
	demoTopUpInputSchema,
	withdrawalRequestInputSchema,
} from "./wallet.schema";

test("wallet request schemas accept caller-controlled fields", () => {
	assert.deepEqual(
		demoTopUpInputSchema.parse({
			amountMinor: 50_000,
			idempotencyKey: "top-up-1",
		}),
		{ amountMinor: 50_000, idempotencyKey: "top-up-1" },
	);
	assert.deepEqual(
		withdrawalRequestInputSchema.parse({
			amountMinor: 12_345,
			idempotencyKey: "withdrawal-1",
		}),
		{ amountMinor: 12_345, idempotencyKey: "withdrawal-1" },
	);
});

test("wallet request schemas reject unsupported amounts and trusted fields", () => {
	assert.equal(
		demoTopUpInputSchema.safeParse({
			amountMinor: 99,
			idempotencyKey: "top-up-2",
		}).success,
		false,
	);
	assert.equal(
		withdrawalRequestInputSchema.safeParse({
			amountMinor: 1_000,
			idempotencyKey: "withdrawal-2",
			playerId: "another-player",
		}).success,
		false,
	);
});
