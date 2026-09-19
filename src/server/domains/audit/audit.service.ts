import "@tanstack/react-start/server-only";

import type { DatabaseTransaction } from "#/server/infra/db/database.types";
import { adminAuditEntry } from "#/server/infra/db/schema";

import {
	type RecordAuditEntryCommand,
	type RecordAuditEntryInput,
	recordAuditEntrySchema,
} from "./audit.schema";

export class AuditServiceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuditServiceError";
	}
}

/**
 * Records audit evidence as part of the caller's transaction. There is
 * intentionally no standalone writer: an audit row must commit or roll back
 * with the mutation it describes.
 */
export async function recordAuditEntryInTransaction(
	transaction: DatabaseTransaction,
	input: RecordAuditEntryInput,
) {
	const command = parseAuditEntry(input);
	const [entry] = await transaction
		.insert(adminAuditEntry)
		.values({
			actorUserId: command.actorUserId,
			targetType: command.target.type,
			targetId: command.target.id,
			action: command.action,
			reason: command.reason,
			metadata: command.metadata,
			...(command.createdAt ? { createdAt: command.createdAt } : {}),
		})
		.returning();

	if (!entry) {
		throw new AuditServiceError("Audit entry could not be recorded");
	}

	return entry;
}

function parseAuditEntry(
	input: RecordAuditEntryInput,
): RecordAuditEntryCommand {
	const result = recordAuditEntrySchema.safeParse(input);
	if (!result.success) {
		throw new AuditServiceError(
			result.error.issues[0]?.message ?? "Audit entry is invalid",
		);
	}
	return result.data;
}
