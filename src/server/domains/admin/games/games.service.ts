import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";

import {
	type UpdateAdminGameInput,
	updateAdminGameInputSchema,
} from "#/lib/schemas/admin-game.schema";
import {
	AdminAuthorizationError,
	assertActiveAdminInTransaction,
} from "#/server/domains/admin/admin-auth.service";
import { recordAuditEntryInTransaction } from "#/server/domains/audit/audit.service";
import { clearCatalogueSearchCache } from "#/server/domains/game/game.service";
import { db } from "#/server/infra/db";
import type { DatabaseTransaction } from "#/server/infra/db/database.types";
import { game } from "#/server/infra/db/schema";

export class AdminGameServiceError extends Error {
	constructor(
		message: string,
		readonly code: "INVALID_INPUT" | "ADMIN_REQUIRED" | "GAME_NOT_FOUND",
	) {
		super(message);
		this.name = "AdminGameServiceError";
	}
}

export async function updateAdminGame(
	input: UpdateAdminGameInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		updateAdminGameInputSchema.parse({
			gameId: input.gameId,
			reason: input.reason,
			isEnabled: input.isEnabled,
			category: input.category,
			isFeatured: input.isFeatured,
			isPopular: input.isPopular,
			isNew: input.isNew,
		}),
	);

	const result = await db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		const [current] = await transaction
			.select()
			.from(game)
			.where(eq(game.id, command.gameId))
			.for("update");
		if (!current)
			throw new AdminGameServiceError("Game was not found", "GAME_NOT_FOUND");

		const next = {
			isEnabled: command.isEnabled ?? current.isEnabled,
			category:
				command.category !== undefined ? command.category : current.category,
			isFeatured: command.isFeatured ?? current.isFeatured,
			isPopular: command.isPopular ?? current.isPopular,
			isNew: command.isNew ?? current.isNew,
		};
		const isDuplicate =
			current.isEnabled === next.isEnabled &&
			current.category === next.category &&
			current.isFeatured === next.isFeatured &&
			current.isPopular === next.isPopular &&
			current.isNew === next.isNew;
		if (isDuplicate) return { isDuplicate: true, game: current };

		const [updated] = await transaction
			.update(game)
			.set({ ...next, updatedAt: new Date() })
			.where(eq(game.id, current.id))
			.returning();
		if (!updated)
			throw new AdminGameServiceError("Game was not found", "GAME_NOT_FOUND");

		await recordAuditEntryInTransaction(transaction, {
			actorUserId: input.actorUserId,
			target: { type: "game", id: current.id },
			action: "game_updated",
			reason: command.reason,
			metadata: {
				externalId: current.externalId,
				name: current.name,
				previous: {
					isEnabled: current.isEnabled,
					category: current.category,
					isFeatured: current.isFeatured,
					isPopular: current.isPopular,
					isNew: current.isNew,
				},
				next,
			},
		});

		return { isDuplicate: false, game: updated };
	});
	if (!result.isDuplicate) clearCatalogueSearchCache();
	return result;
}

function parseInput<T>(parse: () => T) {
	try {
		return parse();
	} catch (error) {
		if (error instanceof Error && error.name === "ZodError") {
			throw new AdminGameServiceError(error.message, "INVALID_INPUT");
		}
		throw error;
	}
}

async function assertAdmin(
	transaction: DatabaseTransaction,
	actorUserId: string,
) {
	try {
		return await assertActiveAdminInTransaction(transaction, actorUserId);
	} catch (error) {
		if (error instanceof AdminAuthorizationError) {
			throw new AdminGameServiceError(
				"An active administrator is required",
				"ADMIN_REQUIRED",
			);
		}
		throw error;
	}
}
