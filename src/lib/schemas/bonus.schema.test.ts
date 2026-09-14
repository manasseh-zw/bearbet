import assert from "node:assert/strict";
import test from "node:test";

import { activateBonusInputSchema } from "./bonus.schema";

test("bonus activation accepts only the selected definition and retry key", () => {
	const input = {
		definitionId: "10000000-0000-4000-8000-000000000001",
		idempotencyKey: "bonus-click-1",
	};
	assert.deepEqual(activateBonusInputSchema.parse(input), input);
	assert.equal(
		activateBonusInputSchema.safeParse({
			...input,
			playerId: "another-player",
			amountMinor: 1_000_000,
		}).success,
		false,
	);
});
