import { z } from "zod";

const booleanFlagSchema = z.union([
	z.boolean(),
	z.literal(0),
	z.literal(1),
	z.literal("0"),
	z.literal("1"),
]);

export const drakonGameSchema = z
	.object({
		game_id: z.union([z.string(), z.number()]),
		game_code: z.union([z.string(), z.number()]).nullish(),
		game_name: z.string().min(1),
		provider_game: z.string().min(1),
		game_type: z.string().nullish(),
		description: z.string().nullish(),
		rtp: z.union([z.string(), z.number()]).nullish(),
		banner: z.string().nullish(),
		cover: z.string().nullish(),
		only_demo: booleanFlagSchema.nullish(),
		status: booleanFlagSchema.nullish(),
		is_mobile: booleanFlagSchema.nullish(),
		has_freespins: booleanFlagSchema.nullish(),
		has_lobby: booleanFlagSchema.nullish(),
		has_tables: booleanFlagSchema.nullish(),
	})
	.loose();

export const drakonCatalogueSchema = z
	.object({
		games: z.array(drakonGameSchema),
	})
	.loose();

export const drakonAuthSchema = z.object({
	access_token: z.string().min(1),
});

export const drakonLaunchSchema = z.object({
	game_url: z.string().min(1),
});

const callbackIdentitySchema = z.object({
	user_id: z.union([z.string(), z.number()]),
	agent_code: z.string().optional(),
	agent_token: z.string().optional(),
	agent_secret_key: z.string().optional(),
});

const callbackOperationSchema = callbackIdentitySchema.extend({
	transaction_id: z.union([z.string(), z.number()]),
	session_id: z.union([z.string(), z.number()]),
	round_id: z.union([z.string(), z.number()]),
	game: z.union([z.string(), z.number()]),
});

const amountSchema = z.union([z.string(), z.number()]);

export const drakonWebhookSchema = z.discriminatedUnion("method", [
	callbackIdentitySchema
		.extend({ method: z.literal("account_details") })
		.loose(),
	callbackIdentitySchema.extend({ method: z.literal("user_balance") }).loose(),
	callbackOperationSchema
		.extend({ method: z.literal("transaction_bet"), bet: amountSchema })
		.loose(),
	callbackOperationSchema
		.extend({
			method: z.literal("transaction_win"),
			bet: amountSchema,
			win: amountSchema,
		})
		.loose(),
	callbackOperationSchema
		.extend({ method: z.literal("refund"), amount: amountSchema })
		.loose(),
]);

export type DrakonGame = z.infer<typeof drakonGameSchema>;
export type DrakonWebhookBody = z.infer<typeof drakonWebhookSchema>;

export type DrakonConfig = {
	baseUrl: string;
	agentCode: string;
	agentToken: string;
	agentSecret: string;
	webhookKey: string;
	mode: "fun" | "real";
};
