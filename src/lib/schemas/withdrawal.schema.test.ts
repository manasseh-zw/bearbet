import assert from "node:assert/strict";
import test from "node:test";

import { withdrawalRequestInputSchema } from "./withdrawal.schema";

test("withdrawal requests accept caller-controlled fields", () => {
	assert.deepEqual(
		withdrawalRequestInputSchema.parse({
			amountMinor: 12_345,
			idempotencyKey: "withdrawal-1",
		}),
		{ amountMinor: 12_345, idempotencyKey: "withdrawal-1" },
	);
});

test("withdrawal requests reject invalid amounts and trusted fields", () => {
	assert.equal(
		withdrawalRequestInputSchema.safeParse({
			amountMinor: 0,
			idempotencyKey: "withdrawal-1",
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
