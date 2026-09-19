import assert from "node:assert/strict";
import { test } from "node:test";

import { catalogueSearchSchema } from "./catalogue.schema";

test("catalogue search normalizes safe defaults", () => {
	assert.deepEqual(catalogueSearchSchema.parse({}), {
		q: "",
		scope: "casino",
		page: 1,
		pageSize: 48,
	});
	assert.equal(
		catalogueSearchSchema.parse({ q: "  roulette  " }).q,
		"roulette",
	);
});

test("catalogue search rejects abusive bounds", () => {
	assert.equal(
		catalogueSearchSchema.safeParse({ q: "x".repeat(81) }).success,
		false,
	);
	assert.equal(
		catalogueSearchSchema.safeParse({ page: 0, pageSize: 101 }).success,
		false,
	);
});
