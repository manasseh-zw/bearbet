import "@tanstack/react-start/server-only";

import { timingSafeEqual } from "node:crypto";
import {
	type DrakonConfig,
	type DrakonWebhookBody,
	drakonWebhookSchema,
} from "#/server/infra/providers/drakon/drakon.types";
import type { NormalizedProviderCallback } from "#/server/infra/providers/provider.types";

export const DRAKON_WEBHOOK_MAX_BYTES = 16_384;

export class DrakonWebhookError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: "UNAUTHORIZED" | "INVALID_REQUEST",
	) {
		super(message);
		this.name = "DrakonWebhookError";
	}
}

export async function parseDrakonWebhook(
	request: Request,
	pathKey: string,
	config: DrakonConfig,
): Promise<NormalizedProviderCallback> {
	if (!equalSecret(pathKey, config.webhookKey)) {
		throw new DrakonWebhookError(
			"Invalid Drakon webhook key",
			401,
			"UNAUTHORIZED",
		);
	}

	const bytes = await request.arrayBuffer();
	if (bytes.byteLength > DRAKON_WEBHOOK_MAX_BYTES) {
		throw new DrakonWebhookError(
			"Drakon webhook body is too large",
			413,
			"INVALID_REQUEST",
		);
	}

	let raw: unknown;
	try {
		raw = JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		throw new DrakonWebhookError(
			"Drakon webhook body is not JSON",
			400,
			"INVALID_REQUEST",
		);
	}

	const parsed = drakonWebhookSchema.safeParse(raw);
	if (!parsed.success) {
		throw new DrakonWebhookError(
			"Drakon webhook body is invalid",
			400,
			"INVALID_REQUEST",
		);
	}

	const credentials = inspectCredentials(parsed.data, config);
	if (credentials.supplied && !credentials.valid) {
		throw new DrakonWebhookError(
			"Invalid Drakon callback credentials",
			401,
			"UNAUTHORIZED",
		);
	}

	return normalizeWebhookBody(parsed.data, credentials.valid);
}

function inspectCredentials(body: DrakonWebhookBody, config: DrakonConfig) {
	const supplied =
		body.agent_code !== undefined ||
		body.agent_token !== undefined ||
		body.agent_secret_key !== undefined;
	const valid =
		equalSecret(body.agent_code, config.agentCode) &&
		equalSecret(body.agent_token, config.agentToken) &&
		equalSecret(body.agent_secret_key, config.agentSecret);
	return { supplied, valid };
}

function normalizeWebhookBody(
	body: DrakonWebhookBody,
	hasValidCredentials: boolean,
): NormalizedProviderCallback {
	const identity = {
		userId: String(body.user_id),
		isDashboardProbe:
			"game" in body && body.game === "test_game" && hasValidCredentials,
	};

	switch (body.method) {
		case "account_details":
			return { ...identity, kind: "accountDetails" };
		case "user_balance":
			return { ...identity, kind: "balance" };
		case "transaction_bet":
			return {
				...identity,
				...operationIdentity(body),
				kind: "bet",
				amountMinor: decimalToMinorUnits(body.bet),
			};
		case "transaction_win":
			return {
				...identity,
				...operationIdentity(body),
				kind: "win",
				betAmountMinor: decimalToMinorUnits(body.bet),
				winAmountMinor: decimalToMinorUnits(body.win),
			};
		case "refund":
			return {
				...identity,
				...operationIdentity(body),
				kind: "refund",
				amountMinor: decimalToMinorUnits(body.amount),
			};
	}
}

function operationIdentity(
	body: Extract<
		DrakonWebhookBody,
		{ method: "transaction_bet" | "transaction_win" | "refund" }
	>,
) {
	return {
		transactionId: String(body.transaction_id),
		sessionId: String(body.session_id),
		roundId: String(body.round_id),
		gameId: String(body.game),
	};
}

function decimalToMinorUnits(value: string | number) {
	const text = String(value);
	const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
	if (!match) {
		throw new DrakonWebhookError(
			"Drakon amount is invalid",
			400,
			"INVALID_REQUEST",
		);
	}

	const amount =
		BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
	if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new DrakonWebhookError(
			"Drakon amount is too large",
			400,
			"INVALID_REQUEST",
		);
	}
	return Number(amount);
}

function equalSecret(value: unknown, expected: string) {
	if (typeof value !== "string") return false;
	const received = Buffer.from(value);
	const configured = Buffer.from(expected);
	return (
		received.length === configured.length &&
		timingSafeEqual(received, configured)
	);
}
