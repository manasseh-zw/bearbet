import { z } from "zod";

export const fixtureGameSchema = z.object({
	id: z.string().min(1),
	code: z.string().optional(),
	name: z.string().min(1),
	provider: z.string().min(1),
	type: z.string().optional(),
	description: z.string().optional(),
	rtp: z.number().optional(),
	bannerUrl: z.url().optional(),
	coverUrl: z.url().optional(),
	supportsFun: z.boolean(),
	isAvailable: z.boolean(),
	isMobile: z.boolean(),
	hasFreeSpins: z.boolean(),
	hasLobby: z.boolean(),
	hasTables: z.boolean(),
});

export const fixtureCatalogueSchema = z.object({
	capturedAt: z.iso.datetime(),
	source: z.literal("drakon"),
	totalSourceGames: z.number().int().nonnegative(),
	games: z.array(fixtureGameSchema),
});

export type FixtureCatalogue = z.infer<typeof fixtureCatalogueSchema>;
