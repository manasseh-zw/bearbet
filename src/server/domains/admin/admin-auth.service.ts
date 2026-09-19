import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";

import type { DatabaseTransaction } from "#/server/infra/db/database.types";
import { user } from "#/server/infra/db/schema";

export class AdminAuthorizationError extends Error {
	constructor(message = "An active administrator is required") {
		super(message);
		this.name = "AdminAuthorizationError";
	}
}

/**
 * Final authorization boundary for administrative mutations. The actor is
 * re-read and locked inside the mutation transaction so a stale session or a
 * concurrent ban cannot authorize a write.
 */
export async function assertActiveAdminInTransaction(
	transaction: DatabaseTransaction,
	actorUserId: string,
) {
	const [actor] = await transaction
		.select({
			id: user.id,
			role: user.role,
			banned: user.banned,
		})
		.from(user)
		.where(eq(user.id, actorUserId))
		.for("update");

	if (!actor || actor.role !== "admin" || actor.banned === true) {
		throw new AdminAuthorizationError();
	}

	return actor;
}
