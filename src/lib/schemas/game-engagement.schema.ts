import { z } from "zod";

export const setPlayerGameFavoriteInputSchema = z
	.object({
		gameId: z.string().trim().min(1).max(200),
		isFavorite: z.boolean(),
	})
	.strict();

export type SetPlayerGameFavoriteInput = z.input<
	typeof setPlayerGameFavoriteInputSchema
>;
