import "@tanstack/react-start/server-only";

import { z } from "zod";

const optionalServerString = z.preprocess(
	(value) => (value === "" ? undefined : value),
	z.string().min(1).optional(),
);

const providerName = z.preprocess(
	(value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
	z.enum(["fixture", "drakon", "bigbang"]),
);

const enabledByDefault = z.preprocess((value) => {
	if (value === undefined || value === "") return true;
	if (typeof value === "boolean") return value;
	return value === "true";
}, z.boolean());

const serverEnvSchema = z.object({
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	BETTER_AUTH_URL: z.string().url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	RESEND_API_KEY: optionalServerString,
	RESEND_FROM_EMAIL: optionalServerString,
	CASINO_PROVIDER: providerName.default("fixture"),
	DRAKON_BASE_URL: z.url().default("https://gator.drakon.casino/api/v1/"),
	DRAKON_AGENT_CODE: optionalServerString,
	DRAKON_AGENT_TOKEN: optionalServerString,
	DRAKON_AGENT_SECRET: optionalServerString,
	DRAKON_WEBHOOK_KEY: z.preprocess(
		(value) => (value === "" ? undefined : value),
		z.string().min(16).optional(),
	),
	DRAKON_MODE: z.enum(["fun", "real"]).default("fun"),
	BIGBANG_BASE_URL: z.url().default("https://api.bigbangcasino.bet/"),
	BIGBANG_SANDBOX_KEY: optionalServerString,
	BIGBANG_SANDBOX_RECONCILIATION: enabledByDefault,
	FIXTURE_PROVIDER_DELAY_MS: z.coerce
		.number()
		.int()
		.min(0)
		.max(30_000)
		.default(0),
	FIXTURE_PROVIDER_FAILURE: z
		.enum(["none", "catalogue", "launch"])
		.default("none"),
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
});

export const env = serverEnvSchema.parse(process.env);

export function getDrakonEnv() {
	const result = z
		.object({
			baseUrl: z.url(),
			agentCode: z.string().min(1),
			agentToken: z.string().min(1),
			agentSecret: z.string().min(1),
			webhookKey: z.string().min(16),
			mode: z.enum(["fun", "real"]),
		})
		.safeParse({
			baseUrl: env.DRAKON_BASE_URL,
			agentCode: env.DRAKON_AGENT_CODE,
			agentToken: env.DRAKON_AGENT_TOKEN,
			agentSecret: env.DRAKON_AGENT_SECRET,
			webhookKey: env.DRAKON_WEBHOOK_KEY,
			mode: env.DRAKON_MODE,
		});

	if (!result.success) {
		throw new Error(
			"Drakon is selected but its agent code, token, secret, or webhook key is missing",
		);
	}

	return result.data;
}

export function getBigBangEnv() {
	const result = z
		.object({
			baseUrl: z.url(),
			sandboxKey: z.string().min(1),
			reconcileSandbox: z.boolean(),
		})
		.safeParse({
			baseUrl: env.BIGBANG_BASE_URL,
			sandboxKey: env.BIGBANG_SANDBOX_KEY,
			reconcileSandbox: env.BIGBANG_SANDBOX_RECONCILIATION,
		});

	if (!result.success) {
		throw new Error(
			"BIGBANG_SANDBOX_KEY is required to use the BigBang provider",
		);
	}

	return {
		...result.data,
		reconcileSandbox:
			result.data.reconcileSandbox &&
			result.data.sandboxKey.startsWith("ek_test_"),
	};
}
