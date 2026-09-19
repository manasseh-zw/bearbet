import assert from "node:assert/strict";
import test from "node:test";

import { formatPasswordResetEmailPreview } from "./email.service";

test("password reset previews include only the local recipient and reset URL", () => {
	assert.equal(
		formatPasswordResetEmailPreview({
			to: "player@example.test",
			url: "http://localhost:3000/reset-password?token=local-token",
		}),
		[
			"[BearBet] Password reset email preview",
			"To: player@example.test",
			"Reset URL: http://localhost:3000/reset-password?token=local-token",
		].join("\n"),
	);
});
