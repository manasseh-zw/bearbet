import assert from "node:assert/strict";
import test from "node:test";

import {
	BIGBANG_WEBHOOK_MAX_BYTES,
	BigBangWebhookError,
	parseBigBangWebhookCapture,
} from "#/server/infra/providers/bigbang/bigbang.webhook";

test("captures an unverified BigBang round webhook without exposing its signature", async () => {
	const result = await parseBigBangWebhookCapture(
		new Request("https://bearbet.test/api/bigbang/webhook", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-webhook-signature": "header-signature",
			},
			body: JSON.stringify({
				event: "round.completed",
				sandbox: true,
				signature: "body-signature",
				round_id: "round-1",
			}),
		}),
	);

	assert.equal(result.event, "round.completed");
	assert.equal(result.sandbox, true);
	assert.equal(result.payload.signature, "[REDACTED]");
	assert.equal(
		result.signatureHeaders["x-webhook-signature"],
		"header-signature",
	);
});

test("rejects malformed and oversized BigBang webhook bodies", async () => {
	await assert.rejects(
		parseBigBangWebhookCapture(
			new Request("https://bearbet.test/api/bigbang/webhook", {
				method: "POST",
				body: "not-json",
			}),
		),
		(error) => error instanceof BigBangWebhookError && error.status === 400,
	);

	await assert.rejects(
		parseBigBangWebhookCapture(
			new Request("https://bearbet.test/api/bigbang/webhook", {
				method: "POST",
				body: JSON.stringify({
					event: "round.completed",
					padding: "x".repeat(BIGBANG_WEBHOOK_MAX_BYTES),
				}),
			}),
		),
		(error) => error instanceof BigBangWebhookError && error.status === 413,
	);
});
