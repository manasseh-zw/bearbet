import { parseArgs } from "node:util";

import { hashPassword } from "better-auth/crypto";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db, pool } from "#/server/infra/db";
import { env } from "#/server/env";
import { account, user } from "#/server/infra/db/schema";

const seedInputSchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(128),
	name: z.string().trim().min(1).max(120),
	username: z
		.string()
		.trim()
		.min(3)
		.max(30)
		.regex(/^[a-zA-Z0-9_]+$/),
});

const { values } = parseArgs({
	options: {
		email: { type: "string" },
		password: { type: "string" },
		name: { type: "string" },
		username: { type: "string" },
	},
	strict: true,
});

const input = seedInputSchema.safeParse({
	email: values.email ?? process.env.ADMIN_EMAIL ?? "admin@bearbet.local",
	password: values.password ?? process.env.ADMIN_PASSWORD ?? "",
	name: values.name ?? process.env.ADMIN_NAME ?? "BearBet Admin",
	username: values.username ?? process.env.ADMIN_USERNAME ?? "admin",
});

if (!input.success) {
	console.error(
		"Admin seed input is invalid. Set ADMIN_PASSWORD in .env.local or pass --password=<local-password>.",
	);
	for (const issue of input.error.issues) {
		console.error(`- ${issue.path.join(".") || "input"}: ${issue.message}`);
	}
	process.exitCode = 1;
	await pool.end();
} else {
	try {
		const result = await seedAdmin(input.data);
		console.log(
			`${result.created ? "Created" : "Updated"} admin account ${input.data.email} (${input.data.username}).`,
		);
		console.log(`Sign in at ${env.BETTER_AUTH_URL}/login`);
	} finally {
		await pool.end();
	}
}

async function seedAdmin(seed: z.output<typeof seedInputSchema>) {
	const password = await hashPassword(seed.password);

	return db.transaction(async (transaction) => {
		const [existingUser] = await transaction
			.select()
			.from(user)
			.where(eq(user.email, seed.email.toLowerCase()))
			.limit(1);

		if (existingUser) {
			const username = existingUser.username ?? seed.username;
			const [usernameOwner] = await transaction
				.select({ id: user.id })
				.from(user)
				.where(and(eq(user.username, username), ne(user.id, existingUser.id)))
				.limit(1);
			if (usernameOwner) {
				throw new Error(`Username "${username}" is already in use`);
			}

			await transaction
				.update(user)
				.set({
					name: seed.name,
					emailVerified: true,
					username,
					displayUsername: username,
					role: "admin",
					banned: false,
					banReason: null,
					banExpires: null,
					updatedAt: new Date(),
				})
				.where(eq(user.id, existingUser.id));

			const [credentialAccount] = await transaction
				.select({ id: account.id })
				.from(account)
				.where(
					and(
						eq(account.userId, existingUser.id),
						eq(account.providerId, "credential"),
					),
				)
				.limit(1);

			if (credentialAccount) {
				await transaction
					.update(account)
					.set({ password, updatedAt: new Date() })
					.where(eq(account.id, credentialAccount.id));
			} else {
				await transaction.insert(account).values({
					id: crypto.randomUUID(),
					accountId: existingUser.id,
					providerId: "credential",
					userId: existingUser.id,
					password,
				});
			}

			return { created: false, userId: existingUser.id };
		}

		const userId = crypto.randomUUID();
		await transaction.insert(user).values({
			id: userId,
			name: seed.name,
			email: seed.email.toLowerCase(),
			emailVerified: true,
			username: seed.username,
			displayUsername: seed.username,
			role: "admin",
			banned: false,
		});
		await transaction.insert(account).values({
			id: crypto.randomUUID(),
			accountId: userId,
			providerId: "credential",
			userId,
			password,
		});

		return { created: true, userId };
	});
}
