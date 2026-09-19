import "@tanstack/react-start/server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { registerPlayerInputSchema } from "#/lib/schemas/auth.schema";
import { env } from "#/server/env";
import { db } from "#/server/infra/db";
import * as schema from "#/server/infra/db/schema";

import { sendPasswordResetEmail } from "../email/email.service";
import { provisionNewPlayer } from "./player-provisioning";

const vercelPreviewOrigin =
	"https://bearbet-*-manassehs-projects-34d48d2a.vercel.app";

export const auth = betterAuth({
	appName: "Bearbet",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
		transaction: true,
	}),
	trustedOrigins: [env.BETTER_AUTH_URL, vercelPreviewOrigin],
	emailAndPassword: {
		enabled: true,
		resetPasswordTokenExpiresIn: 30 * 60,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			await sendPasswordResetEmail({ to: user.email, url });
		},
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
			"/request-password-reset": { max: 3, window: 60 },
		},
	},
	hooks: {
		before: createAuthMiddleware(async (context) => {
			if (context.path === "/sign-up/email") {
				registerPlayerInputSchema.parse(context.body);
			}
		}),
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user, context) => {
					if (context?.path !== "/sign-up/email") {
						return;
					}

					const registration = registerPlayerInputSchema.parse(context.body);

					await provisionNewPlayer({
						userId: user.id,
						firstName: registration.firstName,
						lastName: registration.lastName,
						dateOfBirth: registration.dateOfBirth,
						countryCode: registration.countryCode,
						currencyCode: registration.currencyCode,
					});
				},
			},
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
