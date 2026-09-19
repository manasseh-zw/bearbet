import "@tanstack/react-start/server-only";

import { z } from "zod";

const auditTargetTypes = [
	"user",
	"wallet",
	"game",
	"bonus_definition",
	"bonus_award",
	"withdrawal",
] as const;

const auditActions = [
	"user_suspended",
	"user_activated",
	"role_changed",
	"balance_adjusted",
	"game_updated",
	"bonus_created",
	"bonus_updated",
	"bonus_activated",
	"bonus_deactivated",
	"withdrawal_approved",
	"withdrawal_rejected",
	"games_synced",
] as const;

export const auditTargetTypeSchema = z.enum(auditTargetTypes);
export const auditActionSchema = z.enum(auditActions);

export const recordAuditEntrySchema = z
	.object({
		actorUserId: z.string().trim().min(1),
		target: z.object({
			type: auditTargetTypeSchema,
			id: z.string().trim().min(1),
		}),
		action: auditActionSchema,
		reason: z.string().trim().min(1).max(500),
		metadata: z.record(z.string(), z.unknown()).default({}),
		createdAt: z.date().optional(),
	})
	.strict();

export type RecordAuditEntryInput = z.input<typeof recordAuditEntrySchema>;
export type RecordAuditEntryCommand = z.output<typeof recordAuditEntrySchema>;
