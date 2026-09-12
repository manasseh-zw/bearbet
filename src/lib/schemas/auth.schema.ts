import { z } from "zod";

export const MINIMUM_PLAYER_AGE = 18;

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
	dateOfBirth: z.iso.date().refine((value) => isAtLeastAge(value), {
		message: `You must be at least ${MINIMUM_PLAYER_AGE} years old`,
	}),
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

export const registrationFormSchema = registerPlayerInputSchema
	.extend({
		confirmPassword: z.string().min(1, "Confirm your password"),
	})
	.refine((input) => input.password === input.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const loginFormSchema = z.object({
	identifier: z.string().trim().min(1, "Enter your email or username"),
	password: z.string().min(1, "Enter your password"),
});

export type PlayerProfileInput = z.input<typeof playerProfileInputSchema>;
export type PlayerProfile = z.output<typeof playerProfileInputSchema>;
export type RegisterPlayerInput = z.input<typeof registerPlayerInputSchema>;
export type RegistrationFormInput = z.input<typeof registrationFormSchema>;
export type LoginFormInput = z.input<typeof loginFormSchema>;

function isAtLeastAge(
	dateOfBirth: string,
	today = new Date(),
	minimumAge = MINIMUM_PLAYER_AGE,
) {
	const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);

	if (!birthYear || !birthMonth || !birthDay) {
		return false;
	}

	const latestBirthYear = today.getUTCFullYear() - minimumAge;
	const latestBirthDate = Date.UTC(
		latestBirthYear,
		today.getUTCMonth(),
		today.getUTCDate(),
	);

	return Date.UTC(birthYear, birthMonth - 1, birthDay) <= latestBirthDate;
}
