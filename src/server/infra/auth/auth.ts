import "@tanstack/react-start/server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { env } from "#/server/env";
import { db } from "#/server/infra/db";
import * as schema from "#/server/infra/db/schema";

export const auth = betterAuth({
	appName: "Bearbet",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	trustedOrigins: [env.BETTER_AUTH_URL],
	emailAndPassword: {
		enabled: true,
		revokeSessionsOnPasswordReset: true,
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
			strategy: "compact",
		},
	},
	rateLimit: {
		enabled: true,
		storage: "database",
		customRules: {
			"/sign-in/email": { max: 5, window: 60 },
			"/sign-in/username": { max: 5, window: 60 },
			"/sign-up/email": { max: 3, window: 60 },
		},
	},
	plugins: [
		username({
			immutableUsername: true,
			maxUsernameLength: 30,
			minUsernameLength: 3,
		}),
		admin({
			adminRoles: ["admin"],
			defaultRole: "user",
		}),
		tanstackStartCookies(),
	],
	advanced: {
		database: {
			joins: true,
		},
	},
});

export type AuthSession = typeof auth.$Infer.Session;
