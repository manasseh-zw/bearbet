import assert from "node:assert/strict";
import test from "node:test";

import {
	emitBonusCompletion,
	subscribeToBonusCompletions,
} from "./bonus-events";

test("bonus completion events reach active subscribers once", () => {
	const received: string[] = [];
	const unsubscribe = subscribeToBonusCompletions((event) =>
		received.push(event.awardId),
	);
	emitBonusCompletion({
		awardId: "award-1",
		convertedAmountMinor: 10_000,
		currencyCode: "USD",
	});
	unsubscribe();
	emitBonusCompletion({
		awardId: "award-2",
		convertedAmountMinor: 5_000,
		currencyCode: "USD",
	});
	assert.deepEqual(received, ["award-1"]);
});
