import { z } from "zod";

const isoCode = (length: number, label: string) =>
	z
		.string()
		.trim()
		.transform((value) => value.toUpperCase())
		.pipe(
			z
				.string()
				.length(length, `${label} must contain ${length} letters`)
				.regex(/^[A-Z]+$/),
		);

export const playerProfileInputSchema = z.object({
	firstName: z.string().trim().min(1).max(80),
	lastName: z.string().trim().min(1).max(80),
	dateOfBirth: z.iso.date(),
	countryCode: isoCode(2, "Country code"),
	currencyCode: isoCode(3, "Currency code"),
});

export const registerPlayerInputSchema = playerProfileInputSchema.extend({
	username: z
		.string()
		.trim()
		.min(3)
		.max(30)
		.regex(
			/^[a-zA-Z0-9_]+$/,
			"Username may contain letters, numbers, and underscores",
		),
	email: z.email(),
	password: z.string().min(8).max(128),
});

export type PlayerProfileInput = z.infer<typeof playerProfileInputSchema>;
export type RegisterPlayerInput = z.infer<typeof registerPlayerInputSchema>;
