import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const BIGBANG_CALLBACK_MAX_BYTES = 16_384;

const bigBangBalanceChangeSchema = z.object({
	username: z.string().min(1).max(255),
	amount: z.union([z.string(), z.number()]),
	game: z.string().min(1).max(255),
	game_category: z.string().min(1).max(255),
	transaction_id: z.string().min(1).max(255),
	signature: z.string().regex(/^[a-f0-9]{64}$/i),
	round_id: z.string().min(1).max(255).optional(),
	type: z.enum(["round", "bet", "win", "refund"]).optional(),
	game_id: z.union([z.string(), z.number()]).optional(),
	provider_id: z.union([z.string(), z.number()]).optional(),
	sandbox: z.boolean().optional(),
});

export type BigBangBalanceChange = z.infer<
	typeof bigBangBalanceChangeSchema
> & {
	amountMinor: number;
};

export class BigBangWalletError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: "UNAUTHORIZED" | "INVALID_REQUEST",
	) {
		super(message);
		this.name = "BigBangWalletError";
	}
}

export async function parseBigBangBalanceChange(
	request: Request,
	apiKey: string,
): Promise<BigBangBalanceChange> {
	const bytes = await request.arrayBuffer();
	if (bytes.byteLength > BIGBANG_CALLBACK_MAX_BYTES) {
		throw new BigBangWalletError(
			"BigBang callback body is too large",
			413,
			"INVALID_REQUEST",
		);
	}

	let raw: unknown;
	try {
		raw = JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		throw new BigBangWalletError(
			"BigBang callback body is not JSON",
			400,
			"INVALID_REQUEST",
		);
	}

	const parsed = bigBangBalanceChangeSchema.safeParse(raw);
	if (!parsed.success) {
		throw new BigBangWalletError(
			"BigBang callback body is invalid",
			400,
			"INVALID_REQUEST",
		);
	}

	const signatureBase = [
		parsed.data.username,
		String(parsed.data.amount),
		parsed.data.game,
		parsed.data.game_category,
		parsed.data.transaction_id,
	].join("");
	const expectedSignature = createHmac("sha256", apiKey)
		.update(signatureBase)
		.digest("hex");
	if (!equalSignature(parsed.data.signature, expectedSignature)) {
		throw new BigBangWalletError(
			"BigBang callback signature is invalid",
			401,
			"UNAUTHORIZED",
		);
	}

	return {
		...parsed.data,
		amountMinor: signedDecimalToMinorUnits(parsed.data.amount),
	};
}

function signedDecimalToMinorUnits(value: string | number) {
	const text = String(value);
	const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
	if (!match) {
		throw new BigBangWalletError(
			"BigBang callback amount is invalid",
			400,
			"INVALID_REQUEST",
		);
	}

	const magnitude =
		BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
	const signed = match[1] === "-" ? -magnitude : magnitude;
	if (
		signed > BigInt(Number.MAX_SAFE_INTEGER) ||
		signed < BigInt(Number.MIN_SAFE_INTEGER)
	) {
		throw new BigBangWalletError(
			"BigBang callback amount is too large",
			400,
			"INVALID_REQUEST",
		);
	}
	return Number(signed);
}

function equalSignature(received: string, expected: string) {
	const receivedBytes = Buffer.from(received, "hex");
	const expectedBytes = Buffer.from(expected, "hex");
	return (
		receivedBytes.length === expectedBytes.length &&
		timingSafeEqual(receivedBytes, expectedBytes)
	);
}
