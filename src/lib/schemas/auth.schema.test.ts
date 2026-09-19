import assert from "node:assert/strict";
import test from "node:test";

import {
	changePasswordFormSchema,
	forgotPasswordFormSchema,
	passwordResetFormSchema,
	playerProfileInputSchema,
} from "./auth.schema";

const validProfile = {
	firstName: "Test",
	lastName: "Player",
	dateOfBirth: "1990-01-01",
	countryCode: "zw",
};

test("player profiles normalize supported currencies", () => {
	const result = playerProfileInputSchema.parse({
		...validProfile,
		currencyCode: "gbp",
	});
	assert.equal(result.currencyCode, "GBP");
});

test("player profiles reject unsupported currency codes", () => {
	assert.throws(
		() =>
			playerProfileInputSchema.parse({
				...validProfile,
				currencyCode: "BTC",
			}),
		/Choose a supported currency/,
	);
});

test("password reset forms require matching passwords", () => {
	assert.throws(
		() =>
			passwordResetFormSchema.parse({
				password: "new-password",
				confirmPassword: "different-password",
			}),
		/Passwords do not match/,
	);
});

test("change password forms reject reusing the current password", () => {
	assert.throws(
		() =>
			changePasswordFormSchema.parse({
				currentPassword: "same-password",
				password: "same-password",
				confirmPassword: "same-password",
			}),
		/Choose a password different from your current password/,
	);
});

test("forgot password forms require an email address", () => {
	assert.throws(
		() => forgotPasswordFormSchema.parse({ email: "not-an-email" }),
		/Invalid email address|valid email address/,
	);
});
