import "@tanstack/react-start/server-only";

import { z } from "zod";

export const BIGBANG_WEBHOOK_MAX_BYTES = 16_384;

const bigBangWebhookEnvelopeSchema = z
	.object({
		event: z.string().min(1).max(100).optional(),
		type: z.string().min(1).max(100).optional(),
		sandbox: z.boolean().optional(),
		signature: z.string().min(1).max(512).optional(),
	})
	.passthrough()
	.refine((value) => value.event || value.type, {
		message: "BigBang webhook event name is missing",
	});

export type BigBangWebhookCapture = {
	event: string;
	payload: Record<string, unknown>;
	rawBody: string;
	sandbox: boolean | undefined;
	signatureHeaders: Record<string, string>;
};

export class BigBangWebhookError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "BigBangWebhookError";
	}
}

export async function parseBigBangWebhookCapture(
	request: Request,
): Promise<BigBangWebhookCapture> {
	const bytes = await request.arrayBuffer();
	if (bytes.byteLength > BIGBANG_WEBHOOK_MAX_BYTES) {
		throw new BigBangWebhookError("BigBang webhook body is too large", 413);
	}

	const rawBody = new TextDecoder().decode(bytes);
	let raw: unknown;
	try {
		raw = JSON.parse(rawBody);
	} catch {
		throw new BigBangWebhookError("BigBang webhook body is not JSON", 400);
	}

	const parsed = bigBangWebhookEnvelopeSchema.safeParse(raw);
	if (!parsed.success) {
		throw new BigBangWebhookError("BigBang webhook body is invalid", 400);
	}

	return {
		event: parsed.data.event ?? parsed.data.type ?? "unknown",
		payload: redactPayloadSignature(parsed.data),
		rawBody,
		sandbox: parsed.data.sandbox,
		signatureHeaders: captureSignatureHeaders(request.headers),
	};
}

function captureSignatureHeaders(headers: Headers) {
	const captured: Record<string, string> = {};
	for (const [name, value] of headers) {
		if (name.toLowerCase().includes("signature")) captured[name] = value;
	}
	return captured;
}

function redactPayloadSignature(payload: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(payload).map(([key, value]) => [
			key,
			key.toLowerCase().includes("signature") ? "[REDACTED]" : value,
		]),
	);
}
