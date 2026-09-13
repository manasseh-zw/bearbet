import assert from "node:assert/strict";
import test from "node:test";

import { playerProfileInputSchema } from "./auth.schema";

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
