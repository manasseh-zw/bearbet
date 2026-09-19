import assert from "node:assert/strict";
import test from "node:test";

import { getInternalRedirect, getPostLoginRedirect } from "./navigation";

test("accepts Bearbet paths and rejects external redirect forms", () => {
	assert.equal(getInternalRedirect("/wallet"), "/wallet");
	assert.equal(
		getInternalRedirect("/games/example?mode=fun#player"),
		"/games/example?mode=fun#player",
	);
	assert.equal(getInternalRedirect("https://example.com"), undefined);
	assert.equal(getInternalRedirect("//example.com"), undefined);
	assert.equal(getInternalRedirect("/\\example.com"), undefined);
	assert.equal(getInternalRedirect(undefined), undefined);
});

test("sends admins to the admin portal and preserves an intended path", () => {
	assert.equal(getPostLoginRedirect({ role: "admin" }), "/admin");
	assert.equal(getPostLoginRedirect({ role: "user" }), "/");
	assert.equal(
		getPostLoginRedirect({ role: "admin", redirectTo: "/admin/withdrawals" }),
		"/admin/withdrawals",
	);
});
