import assert from "node:assert/strict";
import test, { after } from "node:test";

import { count, eq } from "drizzle-orm";

import { db, pool } from "#/server/infra/db";
import { account, user } from "#/server/infra/db/schema";

import { provisionNewPlayer } from "./player-provisioning";

after(async () => {
	await pool.end();
});

test("failed player provisioning removes the committed identity", async () => {
	const userId = `provisioning-test-${crypto.randomUUID()}`;
	const provisioningError = new Error("Provisioning failed");
	await db.insert(user).values({
		id: userId,
		name: "Provisioning Test",
		email: `${userId}@bearbet.test`,
	});
	await db.insert(account).values({
		id: crypto.randomUUID(),
		accountId: userId,
		providerId: "credential",
		userId,
	});

	await assert.rejects(
		provisionNewPlayer(
			{
				userId,
				firstName: "Provisioning",
				lastName: "Test",
				dateOfBirth: "1990-01-01",
				countryCode: "ZW",
				currencyCode: "USD",
			},
			{
				register: async () => {
					throw provisioningError;
				},
			},
		),
		(error) => error === provisioningError,
	);

	const [identityCount] = await db
		.select({ value: count() })
		.from(user)
		.where(eq(user.id, userId));
	const [accountCount] = await db
		.select({ value: count() })
		.from(account)
		.where(eq(account.userId, userId));
	assert.equal(identityCount?.value, 0);
	assert.equal(accountCount?.value, 0);
});

test("cleanup failures retain both causes", async () => {
	const provisioningError = new Error("Provisioning failed");
	const cleanupError = new Error("Cleanup failed");
	await assert.rejects(
		provisionNewPlayer(
			{
				userId: "cleanup-failure",
				firstName: "Cleanup",
				lastName: "Failure",
				dateOfBirth: "1990-01-01",
				countryCode: "ZW",
				currencyCode: "USD",
			},
			{
				register: async () => {
					throw provisioningError;
				},
				deleteIdentity: async () => {
					throw cleanupError;
				},
			},
		),
		(error) =>
			error instanceof AggregateError &&
			error.errors[0] === provisioningError &&
			error.errors[1] === cleanupError,
	);
});
