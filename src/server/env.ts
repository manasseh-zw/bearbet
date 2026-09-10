import "@tanstack/react-start/server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	BETTER_AUTH_URL: z.string().url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	CASINO_PROVIDER: z.enum(["fixture", "drakon"]).default("fixture"),
	DRAKON_BASE_URL: z.url().default("https://gator.drakon.casino/api/v1/"),
	DRAKON_AGENT_CODE: z.string().min(1).optional(),
	DRAKON_AGENT_TOKEN: z.string().min(1).optional(),
	DRAKON_AGENT_SECRET: z.string().min(1).optional(),
	DRAKON_WEBHOOK_KEY: z.string().min(16).optional(),
	DRAKON_MODE: z.enum(["fun", "real"]).default("fun"),
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
