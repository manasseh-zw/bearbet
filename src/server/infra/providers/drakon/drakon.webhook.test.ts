import assert from "node:assert/strict";
import { test } from "node:test";

import type { DrakonConfig } from "#/server/infra/providers/drakon/drakon.types";
import {
	DRAKON_WEBHOOK_MAX_BYTES,
	DrakonWebhookError,
	parseDrakonWebhook,
} from "#/server/infra/providers/drakon/drakon.webhook";

const config: DrakonConfig = {
	baseUrl: "https://gator.drakon.casino/api/v1/",
	agentCode: "test-code",
	agentToken: "test-token",
	agentSecret: "test-secret",
	webhookKey: "test-webhook-key",
	mode: "fun",
};

test("Drakon webhook authenticates and normalizes financial callbacks to minor units", async () => {
	const request = callbackRequest({
		method: "transaction_win",
		user_id: 123,
		transaction_id: "win-1",
		session_id: "session-1",
		round_id: "round-1",
		game: "51096",
		bet: "10.50",
		win: 25,
		agent_code: config.agentCode,
		agent_token: config.agentToken,
		agent_secret_key: config.agentSecret,
	});

	assert.deepEqual(
		await parseDrakonWebhook(request, config.webhookKey, config),
		{
			kind: "win",
			userId: "123",
			transactionId: "win-1",
			sessionId: "session-1",
			roundId: "round-1",
			gameId: "51096",
			betAmountMinor: 1050,
			winAmountMinor: 2500,
			isDashboardProbe: false,
		},
	);
});

test("Drakon webhook recognizes an authenticated dashboard probe", async () => {
	const request = callbackRequest({
		method: "transaction_bet",
		user_id: "test_user",
		transaction_id: "test-transaction",
		session_id: "test-session",
		round_id: "test-round",
		game: "test_game",
		bet: 100,
		agent_code: config.agentCode,
		agent_token: config.agentToken,
		agent_secret_key: config.agentSecret,
	});
	const callback = await parseDrakonWebhook(request, config.webhookKey, config);
	assert.equal(callback.isDashboardProbe, true);
});

test("Drakon webhook rejects bad keys, partial credentials, invalid amounts, and large bodies", async () => {
	await assertWebhookError(
		parseDrakonWebhook(
			callbackRequest({ method: "user_balance", user_id: "1" }),
			"bad-key",
			config,
		),
		401,
		"UNAUTHORIZED",
	);
	await assertWebhookError(
		parseDrakonWebhook(
			callbackRequest({
				method: "user_balance",
				user_id: "1",
				agent_code: config.agentCode,
			}),
			config.webhookKey,
			config,
		),
		401,
		"UNAUTHORIZED",
	);
	await assertWebhookError(
		parseDrakonWebhook(
			callbackRequest({
				method: "transaction_bet",
				user_id: "1",
				transaction_id: "1",
				session_id: "1",
				round_id: "1",
				game: "1",
				bet: "1.999",
			}),
			config.webhookKey,
			config,
		),
		400,
		"INVALID_REQUEST",
	);
	await assertWebhookError(
		parseDrakonWebhook(
			new Request("https://bearbet.local/callback", {
				method: "POST",
				body: "x".repeat(DRAKON_WEBHOOK_MAX_BYTES + 1),
			}),
			config.webhookKey,
			config,
		),
		413,
		"INVALID_REQUEST",
	);
});

function callbackRequest(body: Record<string, unknown>) {
	return new Request("https://bearbet.local/callback", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

async function assertWebhookError(
	promise: Promise<unknown>,
	status: number,
	code: DrakonWebhookError["code"],
) {
	await assert.rejects(promise, (error) => {
		assert.ok(error instanceof DrakonWebhookError);
		assert.equal(error.status, status);
		assert.equal(error.code, code);
		return true;
	});
}
