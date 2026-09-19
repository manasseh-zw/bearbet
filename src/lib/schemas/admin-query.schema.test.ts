import assert from "node:assert/strict";
import test from "node:test";

import {
	adminCursorQuerySchema,
	adminUserQuerySchema,
} from "./admin-query.schema";

test("admin cursor queries apply a bounded default limit", () => {
	assert.deepEqual(adminCursorQuerySchema.parse({}), { limit: 50 });
	assert.deepEqual(
		adminCursorQuerySchema.parse({ cursor: "createdAt:123", limit: "25" }),
		{ cursor: "createdAt:123", limit: 25 },
	);
});

test("admin cursor queries reject empty cursors and oversized limits", () => {
	assert.equal(adminCursorQuerySchema.safeParse({ cursor: "" }).success, false);
	assert.equal(adminCursorQuerySchema.safeParse({ limit: 101 }).success, false);
});

test("admin user queries use the shared offset pagination bounds", () => {
	assert.deepEqual(adminUserQuerySchema.parse({}), {
		direction: "desc",
		page: 1,
		pageSize: 20,
		role: "all",
		search: "",
		sort: "createdAt",
		status: "all",
	});
	assert.equal(
		adminUserQuerySchema.safeParse({ pageSize: 101 }).success,
		false,
	);
});
