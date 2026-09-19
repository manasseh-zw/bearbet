import assert from "node:assert/strict";
import test, { after } from "node:test";

import { inArray } from "drizzle-orm";

import { db, pool } from "#/server/infra/db";
import { user } from "#/server/infra/db/schema";

import { listAdminUsers } from "./users.query";

after(async () => {
	await pool.end();
});

test("admin user query searches explicit identity projections and filters status and role", async (context) => {
	const suffix = crypto.randomUUID();
	const ids = [
		`query-admin-${suffix}`,
		`query-active-${suffix}`,
		`query-suspended-${suffix}`,
	];
	context.after(async () => {
		await db.delete(user).where(inArray(user.id, ids));
	});

	await db.insert(user).values([
		{
			id: ids[0],
			name: "Query Administrator",
			email: `${ids[0]}@bearbet.test`,
			role: "admin",
			banned: false,
		},
		{
			id: ids[1],
			name: "Searchable Player",
			email: `${ids[1]}@bearbet.test`,
			username: `searchable_${suffix.slice(0, 8)}`,
			role: "user",
			banned: false,
		},
		{
			id: ids[2],
			name: "Suspended Player",
			email: `${ids[2]}@bearbet.test`,
			role: "user",
			banned: true,
		},
	]);

	const searched = await listAdminUsers({
		page: 1,
		pageSize: 20,
		search: "searchable",
		status: "active",
		role: "user",
		sort: "name",
		direction: "asc",
	});
	assert.equal(searched.pagination.total, 1);
	assert.equal(searched.items[0]?.user.id, ids[1]);
	assert.equal("password" in (searched.items[0]?.user ?? {}), false);
	assert.equal(searched.items[0]?.wallet, null);

	const suspended = await listAdminUsers({
		page: 1,
		pageSize: 20,
		search: "",
		status: "suspended",
		role: "user",
		sort: "createdAt",
		direction: "desc",
	});
	assert.equal(
		suspended.items.some((item) => item.user.id === ids[2]),
		true,
	);
	assert.equal(
		suspended.items.some((item) => item.user.id === ids[1]),
		false,
	);
});
