import assert from "node:assert/strict";
import test from "node:test";
import { emitToast, subscribeToToasts } from "./toast-events";

test("toast events reach active subscribers", () => {
	const received: Array<{ title: string; description?: string }> = [];
	const unsubscribe = subscribeToToasts((event) => received.push(event));

	emitToast({ title: "Demo funds added", description: "$500.00 added." });
	unsubscribe();
	emitToast({ title: "This should not be received" });

	assert.deepEqual(received, [
		{ title: "Demo funds added", description: "$500.00 added." },
	]);
});
