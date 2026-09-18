import "@tanstack/react-start/server-only";

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const CAPTURE_PATH = resolve("data/bigbang-callbacks.raw.json");

export async function captureBigBangCallback(event: Record<string, unknown>) {
	await mkdir(dirname(CAPTURE_PATH), { recursive: true });
	await appendFile(
		CAPTURE_PATH,
		`${JSON.stringify({ capturedAt: new Date().toISOString(), ...event })}\n`,
		"utf8",
	);
}

export function redactBigBangPayload(raw: string) {
	try {
		const payload = JSON.parse(raw) as Record<string, unknown>;
		if ("signature" in payload) payload.signature = "[REDACTED]";
		return payload;
	} catch {
		return { invalidJson: true, byteLength: Buffer.byteLength(raw) };
	}
}
