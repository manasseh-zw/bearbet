import assert from "node:assert/strict";
import test from "node:test";

import {
	closeDemoGameInputSchema,
	playDemoGameInputSchema,
	startDemoGameInputSchema,
} from "./gameplay.schema";

test("demo game requests accept only caller-controlled session and stake fields", () => {
	assert.equal(
		startDemoGameInputSchema.safeParse({ gameId: "460", launchKey: "launch-1" })
			.success,
		true,
	);
	assert.equal(
		playDemoGameInputSchema.safeParse({
			sessionId: crypto.randomUUID(),
			stakeMinor: 1_000,
			idempotencyKey: "round-1",
		}).success,
		true,
	);
	assert.equal(
		closeDemoGameInputSchema.safeParse({ sessionId: crypto.randomUUID() })
			.success,
		true,
	);
	assert.equal(
		playDemoGameInputSchema.safeParse({
			sessionId: crypto.randomUUID(),
			stakeMinor: 0,
			idempotencyKey: "round-1",
			playerId: "untrusted",
		}).success,
		false,
	);
});
