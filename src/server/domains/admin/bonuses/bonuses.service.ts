import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";
import { ZodError } from "zod";

import {
	type CreateAdminBonusDefinitionInput,
	createAdminBonusDefinitionInputSchema,
	type SetAdminBonusDefinitionStatusInput,
	setAdminBonusDefinitionStatusInputSchema,
	type UpdateAdminBonusDefinitionInput,
	updateAdminBonusDefinitionInputSchema,
} from "#/lib/schemas/admin-bonus.schema";
import {
	AdminAuthorizationError,
	assertActiveAdminInTransaction,
} from "#/server/domains/admin/admin-auth.service";
import { recordAuditEntryInTransaction } from "#/server/domains/audit/audit.service";
import { isManagedPublicAssetUrl } from "#/server/infra/blob/blob-storage";
import { db } from "#/server/infra/db";
import type { DatabaseTransaction } from "#/server/infra/db/database.types";
import { bonusDefinition } from "#/server/infra/db/schema";

export class AdminBonusServiceError extends Error {
	constructor(
		message: string,
		readonly code:
			| "INVALID_INPUT"
			| "ADMIN_REQUIRED"
			| "BONUS_NOT_FOUND"
			| "DUPLICATE_CODE",
	) {
		super(message);
		this.name = "AdminBonusServiceError";
	}
}

export async function createAdminBonusDefinition(
	input: CreateAdminBonusDefinitionInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		createAdminBonusDefinitionInputSchema.parse({
			code: input.code,
			name: input.name,
			description: input.description,
			thumbnailUrl: input.thumbnailUrl,
			type: input.type,
			amountMinor: input.amountMinor,
			matchPercentageBps: input.matchPercentageBps,
			wageringMultiplier: input.wageringMultiplier,
			expiresAfterDays: input.expiresAfterDays,
			minimumDepositMinor: input.minimumDepositMinor,
			maximumAwardMinor: input.maximumAwardMinor,
			eligibleGameIds: input.eligibleGameIds,
			eligibleCategories: input.eligibleCategories,
			eligibleProviders: input.eligibleProviders,
			reason: input.reason,
		}),
	);
	assertThumbnailUrl(command.thumbnailUrl);
	return db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		const [existing] = await transaction
			.select({ id: bonusDefinition.id })
			.from(bonusDefinition)
			.where(eq(bonusDefinition.code, command.code));
		if (existing) {
			throw new AdminBonusServiceError(
				"A bonus with this code already exists",
				"DUPLICATE_CODE",
			);
		}

		const [created] = await transaction
			.insert(bonusDefinition)
			.values({
				code: command.code,
				name: command.name,
				description: command.description,
				thumbnailUrl: command.thumbnailUrl,
				type: command.type,
				amountMinor: command.amountMinor,
				matchPercentageBps: command.matchPercentageBps,
				wageringMultiplier: command.wageringMultiplier,
				expiresAfterDays: command.expiresAfterDays,
				minimumDepositMinor: command.minimumDepositMinor,
				maximumAwardMinor: command.maximumAwardMinor,
				eligibleGameIds: command.eligibleGameIds,
				eligibleCategories: command.eligibleCategories,
				eligibleProviders: command.eligibleProviders,
			})
			.returning();
		if (!created) {
			throw new AdminBonusServiceError(
				"Bonus definition could not be created",
				"INVALID_INPUT",
			);
		}

		await recordAuditEntryInTransaction(transaction, {
			actorUserId: input.actorUserId,
			target: { type: "bonus_definition", id: created.id },
			action: "bonus_created",
			reason: command.reason,
			metadata: { definition: auditDefinition(created) },
		});

		return { definition: created, isDuplicate: false };
	});
}

export async function updateAdminBonusDefinition(
	input: UpdateAdminBonusDefinitionInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		updateAdminBonusDefinitionInputSchema.parse({
			definitionId: input.definitionId,
			name: input.name,
			description: input.description,
			thumbnailUrl: input.thumbnailUrl,
			type: input.type,
			amountMinor: input.amountMinor,
			matchPercentageBps: input.matchPercentageBps,
			wageringMultiplier: input.wageringMultiplier,
			expiresAfterDays: input.expiresAfterDays,
			minimumDepositMinor: input.minimumDepositMinor,
			maximumAwardMinor: input.maximumAwardMinor,
			eligibleGameIds: input.eligibleGameIds,
			eligibleCategories: input.eligibleCategories,
			eligibleProviders: input.eligibleProviders,
			reason: input.reason,
		}),
	);
	assertThumbnailUrl(command.thumbnailUrl);
	return db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		const current = await lockDefinition(transaction, command.definitionId);
		if (!current) throw bonusNotFound();

		const next = {
			name: command.name,
			description: command.description ?? null,
			thumbnailUrl: command.thumbnailUrl ?? null,
			type: command.type,
			amountMinor: command.amountMinor,
			matchPercentageBps: command.matchPercentageBps ?? null,
			wageringMultiplier: command.wageringMultiplier,
			expiresAfterDays: command.expiresAfterDays,
			minimumDepositMinor: command.minimumDepositMinor ?? null,
			maximumAwardMinor: command.maximumAwardMinor ?? null,
			eligibleGameIds: command.eligibleGameIds,
			eligibleCategories: command.eligibleCategories,
			eligibleProviders: command.eligibleProviders,
		};
		if (sameDefinition(current, next)) {
			return { definition: current, isDuplicate: true };
		}

		const [updated] = await transaction
			.update(bonusDefinition)
			.set({ ...next, updatedAt: new Date() })
			.where(eq(bonusDefinition.id, current.id))
			.returning();
		if (!updated) throw bonusNotFound();

		await recordAuditEntryInTransaction(transaction, {
			actorUserId: input.actorUserId,
			target: { type: "bonus_definition", id: current.id },
			action: "bonus_updated",
			reason: command.reason,
			metadata: {
				code: current.code,
				previous: auditDefinition(current),
				next: auditDefinition(updated),
			},
		});

		return { definition: updated, isDuplicate: false };
	});
}

export async function setAdminBonusDefinitionStatus(
	input: SetAdminBonusDefinitionStatusInput & { actorUserId: string },
) {
	const command = parseInput(() =>
		setAdminBonusDefinitionStatusInputSchema.parse({
			definitionId: input.definitionId,
			isActive: input.isActive,
			reason: input.reason,
		}),
	);
	return db.transaction(async (transaction) => {
		await assertAdmin(transaction, input.actorUserId);
		const current = await lockDefinition(transaction, command.definitionId);
		if (!current) throw bonusNotFound();
		if (current.isActive === command.isActive) {
			return { definition: current, isDuplicate: true };
		}

		const [updated] = await transaction
			.update(bonusDefinition)
			.set({ isActive: command.isActive, updatedAt: new Date() })
			.where(eq(bonusDefinition.id, current.id))
			.returning();
		if (!updated) throw bonusNotFound();

		await recordAuditEntryInTransaction(transaction, {
			actorUserId: input.actorUserId,
			target: { type: "bonus_definition", id: current.id },
			action: command.isActive ? "bonus_activated" : "bonus_deactivated",
			reason: command.reason,
			metadata: {
				code: current.code,
				previousStatus: current.isActive ? "active" : "inactive",
				nextStatus: updated.isActive ? "active" : "inactive",
			},
		});

		return { definition: updated, isDuplicate: false };
	});
}

async function lockDefinition(
	transaction: DatabaseTransaction,
	definitionId: string,
) {
	const [definition] = await transaction
		.select()
		.from(bonusDefinition)
		.where(eq(bonusDefinition.id, definitionId))
		.for("update");
	return definition;
}

async function assertAdmin(
	transaction: DatabaseTransaction,
	actorUserId: string,
) {
	try {
		return await assertActiveAdminInTransaction(transaction, actorUserId);
	} catch (error) {
		if (error instanceof AdminAuthorizationError) {
			throw new AdminBonusServiceError(
				"An active administrator is required",
				"ADMIN_REQUIRED",
			);
		}
		throw error;
	}
}

function parseInput<T>(parse: () => T) {
	try {
		return parse();
	} catch (error) {
		if (error instanceof ZodError) {
			throw new AdminBonusServiceError(
				error.issues[0]?.message ?? "Bonus definition input is invalid",
				"INVALID_INPUT",
			);
		}
		throw error;
	}
}

function bonusNotFound() {
	return new AdminBonusServiceError(
		"Bonus definition was not found",
		"BONUS_NOT_FOUND",
	);
}

function assertThumbnailUrl(thumbnailUrl: string | null | undefined) {
	if (!thumbnailUrl) return;
	if (!isManagedPublicAssetUrl(thumbnailUrl)) {
		throw new AdminBonusServiceError(
			"Bonus thumbnails must be uploaded to the public Vercel Blob store",
			"INVALID_INPUT",
		);
	}
}

function sameDefinition(
	current: typeof bonusDefinition.$inferSelect,
	next: Omit<typeof bonusDefinition.$inferInsert, "id" | "code">,
) {
	return (
		current.name === next.name &&
		current.description === next.description &&
		current.thumbnailUrl === next.thumbnailUrl &&
		current.type === next.type &&
		current.amountMinor === next.amountMinor &&
		current.matchPercentageBps === next.matchPercentageBps &&
		current.wageringMultiplier === next.wageringMultiplier &&
		current.expiresAfterDays === next.expiresAfterDays &&
		current.minimumDepositMinor === next.minimumDepositMinor &&
		current.maximumAwardMinor === next.maximumAwardMinor &&
		JSON.stringify(current.eligibleGameIds) ===
			JSON.stringify(next.eligibleGameIds) &&
		JSON.stringify(current.eligibleCategories) ===
			JSON.stringify(next.eligibleCategories) &&
		JSON.stringify(current.eligibleProviders) ===
			JSON.stringify(next.eligibleProviders)
	);
}

function auditDefinition(definition: typeof bonusDefinition.$inferSelect) {
	return {
		code: definition.code,
		name: definition.name,
		thumbnailUrl: definition.thumbnailUrl,
		type: definition.type,
		amountMinor: definition.amountMinor,
		matchPercentageBps: definition.matchPercentageBps,
		wageringMultiplier: definition.wageringMultiplier,
		expiresAfterDays: definition.expiresAfterDays,
		minimumDepositMinor: definition.minimumDepositMinor,
		maximumAwardMinor: definition.maximumAwardMinor,
		eligibleGameIds: definition.eligibleGameIds,
		eligibleCategories: definition.eligibleCategories,
		eligibleProviders: definition.eligibleProviders,
		isActive: definition.isActive,
	};
}
