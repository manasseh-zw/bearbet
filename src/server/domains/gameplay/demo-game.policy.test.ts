import assert from "node:assert/strict";
import test from "node:test";

import {
	DEMO_DRAW_SIZE,
	DEMO_WIN_MULTIPLIER,
	resolveDemoGameOutcome,
} from "./demo-game.policy";

test("demo outcomes are deterministic, bounded, and pay the advertised return", () => {
	const input = {
		secret: "test-secret",
		playerId: "player-1",
		sessionId: "session-1",
		idempotencyKey: "round-1",
		stakeMinor: 2_500,
	};
	const first = resolveDemoGameOutcome(input);
	const retry = resolveDemoGameOutcome(input);

	assert.deepEqual(retry, first);
	assert.ok(first.draw >= 1 && first.draw <= DEMO_DRAW_SIZE);
	assert.equal(
		first.winAmountMinor,
		first.outcome === "win" ? input.stakeMinor * DEMO_WIN_MULTIPLIER : 0,
	);
});
