import "@tanstack/react-start/server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	BETTER_AUTH_URL: z.string().url(),
	BETTER_AUTH_SECRET: z.string().min(32),
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
});

export const env = serverEnvSchema.parse(process.env);
