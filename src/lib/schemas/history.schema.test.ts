import assert from "node:assert/strict";
import test from "node:test";

import { historyQuerySchema } from "./history.schema";

test("history query applies safe defaults and coerces the page", () => {
	assert.deepEqual(historyQuerySchema.parse({}), {
		category: "all",
		page: 1,
	});
	assert.equal(historyQuerySchema.parse({ page: "3" }).page, 3);
});

test("history query rejects invalid filters and reversed dates", () => {
	assert.equal(
		historyQuerySchema.safeParse({ category: "casino" }).success,
		false,
	);
	assert.equal(
		historyQuerySchema.safeParse({ from: "2026-09-13", to: "2026-09-01" })
			.success,
		false,
	);
});
