import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
	advanceWagering,
	calculateRequiredWager,
	determineActiveAwardOutcome,
	isGameEligible,
	reverseWagering,
} from "./bonus.policy";

describe("bonus policy", () => {
	test("calculates and caps wagering progress in exact minor units", () => {
		assert.equal(calculateRequiredWager(10_000, 5), 50_000);
		assert.equal(
			advanceWagering({
				completedWagerMinor: 49_500,
				requiredWagerMinor: 50_000,
				contributionMinor: 1_000,
			}),
			50_000,
		);
		assert.equal(
			reverseWagering({ completedWagerMinor: 500, reversalMinor: 750 }),
			0,
		);
	});

	test("rejects invalid bonus amounts and multipliers", () => {
		assert.throws(() => calculateRequiredWager(0, 5));
		assert.throws(() => calculateRequiredWager(10_000, 1.5));
		assert.throws(() => calculateRequiredWager(Number.MAX_SAFE_INTEGER, 2));
	});

	test("waits for unsettled operations before completion or exhaustion", () => {
		const base = {
			completedWagerMinor: 50_000,
			requiredWagerMinor: 50_000,
			bonusBalanceMinor: 0,
			expiresAt: new Date("2030-01-02T00:00:00Z"),
			now: new Date("2030-01-01T00:00:00Z"),
		};
		assert.equal(
			determineActiveAwardOutcome({ ...base, unsettledOperationCount: 1 }),
			"active",
		);
		assert.equal(
			determineActiveAwardOutcome({ ...base, unsettledOperationCount: 0 }),
			"completed",
		);
		assert.equal(
			determineActiveAwardOutcome({
				...base,
				completedWagerMinor: 10_000,
				unsettledOperationCount: 0,
			}),
			"exhausted",
		);
	});

	test("expiry takes priority over completion", () => {
		assert.equal(
			determineActiveAwardOutcome({
				completedWagerMinor: 50_000,
				requiredWagerMinor: 50_000,
				bonusBalanceMinor: 10_000,
				unsettledOperationCount: 0,
				expiresAt: new Date("2030-01-01T00:00:00Z"),
				now: new Date("2030-01-01T00:00:00Z"),
			}),
			"expired",
		);
	});

	test("an expired award waits for its last unsettled operation", () => {
		assert.equal(
			determineActiveAwardOutcome({
				completedWagerMinor: 1_000,
				requiredWagerMinor: 5_000,
				bonusBalanceMinor: 2_000,
				unsettledOperationCount: 1,
				expiresAt: new Date("2030-01-01T00:00:00Z"),
				now: new Date("2030-01-02T00:00:00Z"),
			}),
			"active",
		);
	});

	test("accepts unrestricted awards and matches any configured eligibility rule", () => {
		assert.equal(
			isGameEligible({
				gameId: "any",
				eligibleGameIds: [],
				eligibleCategories: [],
				eligibleProviders: [],
			}),
			true,
		);
		assert.equal(
			isGameEligible({
				gameId: "other",
				category: "slots",
				provider: "fixture",
				eligibleGameIds: ["chosen"],
				eligibleCategories: ["roulette"],
				eligibleProviders: ["fixture"],
			}),
			true,
		);
		assert.equal(
			isGameEligible({
				gameId: "other",
				category: "slots",
				provider: "different",
				eligibleGameIds: ["chosen"],
				eligibleCategories: ["roulette"],
				eligibleProviders: ["fixture"],
			}),
			false,
		);
	});
});
