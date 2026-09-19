import assert from "node:assert/strict";
import test from "node:test";

import { historyQuerySchema } from "./history.schema";

test("history query applies safe defaults and coerces the page", () => {
	assert.deepEqual(historyQuerySchema.parse({}), {
		category: "all",
		page: 1,
		types: [],
		timeRange: "all",
		direction: "desc",
	});
	assert.equal(historyQuerySchema.parse({ page: "3" }).page, 3);
	assert.deepEqual(
		historyQuerySchema.parse({ types: ["win", "refund"] }).types,
		["win", "refund"],
	);
});

test("history query rejects invalid filters and applies history defaults", () => {
	assert.equal(
		historyQuerySchema.safeParse({ category: "casino" }).success,
		false,
	);
	assert.equal(
		historyQuerySchema.safeParse({ timeRange: "month" }).success,
		false,
	);
});
