import assert from "node:assert/strict";
import test from "node:test";

import { getInternalRedirect } from "./navigation";

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
