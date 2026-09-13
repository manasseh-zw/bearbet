import assert from "node:assert/strict";
import test from "node:test";

import { demoTopUpInputSchema } from "./wallet.schema";

test("wallet requests accept caller-controlled fields", () => {
	assert.deepEqual(
		demoTopUpInputSchema.parse({
			amountMinor: 50_000,
			idempotencyKey: "top-up-1",
		}),
		{ amountMinor: 50_000, idempotencyKey: "top-up-1" },
	);
});

test("wallet requests reject unsupported amounts", () => {
	assert.equal(
		demoTopUpInputSchema.safeParse({
			amountMinor: 99,
			idempotencyKey: "top-up-2",
		}).success,
		false,
	);
});
