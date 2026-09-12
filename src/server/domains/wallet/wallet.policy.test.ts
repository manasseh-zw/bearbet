import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
	allocateRefund,
	allocateStake,
	allocateWin,
	checkedAdd,
	MoneyRuleError,
	playableBalance,
} from "./wallet.policy";

const balances = {
	cashBalanceMinor: 100_000,
	bonusBalanceMinor: 10_000,
	reservedCashMinor: 20_000,
};

describe("wallet policy", () => {
	test("reports cash plus bonus as playable and excludes reserved cash", () => {
		assert.equal(playableBalance(balances), 110_000);
	});

	test("spends bonus before cash for eligible gameplay", () => {
		assert.deepEqual(
			allocateStake({ stakeMinor: 12_000, balances, isBonusEligible: true }),
			{
				bonusStakeMinor: 10_000,
				cashStakeMinor: 2_000,
				wageringContributionMinor: 10_000,
				balances: {
					cashBalanceMinor: 98_000,
					bonusBalanceMinor: 0,
					reservedCashMinor: 20_000,
				},
			},
		);
	});

	test("spends only cash for excluded gameplay", () => {
		const result = allocateStake({
			stakeMinor: 12_000,
			balances,
			isBonusEligible: false,
		});
		assert.equal(result.cashStakeMinor, 12_000);
		assert.equal(result.bonusStakeMinor, 0);
		assert.equal(result.wageringContributionMinor, 0);
		assert.equal(result.balances.bonusBalanceMinor, 10_000);
	});

	test("rejects zero, fractional, unsafe, and unaffordable stakes", () => {
		for (const stakeMinor of [0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
			assert.throws(
				() => allocateStake({ stakeMinor, balances, isBonusEligible: true }),
				MoneyRuleError,
			);
		}
		assert.throws(
			() =>
				allocateStake({
					stakeMinor: 110_001,
					balances,
					isBonusEligible: true,
				}),
			(error) =>
				error instanceof MoneyRuleError && error.code === "INSUFFICIENT_FUNDS",
		);
	});

	test("allocates a mixed win proportionally and gives rounding remainder to cash", () => {
		assert.deepEqual(
			allocateWin({
				winMinor: 2_501,
				cashStakeMinor: 600,
				bonusStakeMinor: 400,
			}),
			{ cashWinMinor: 1_501, bonusWinMinor: 1_000 },
		);
		assert.deepEqual(
			allocateWin({
				winMinor: 2_500,
				cashStakeMinor: 0,
				bonusStakeMinor: 1_000,
			}),
			{ cashWinMinor: 0, bonusWinMinor: 2_500 },
		);
	});

	test("restores a full refund exactly and prorates a partial refund", () => {
		assert.deepEqual(
			allocateRefund({
				refundMinor: 1_000,
				refundableCashMinor: 600,
				refundableBonusMinor: 400,
			}),
			{ cashRefundMinor: 600, bonusRefundMinor: 400 },
		);
		assert.deepEqual(
			allocateRefund({
				refundMinor: 501,
				refundableCashMinor: 600,
				refundableBonusMinor: 400,
			}),
			{ cashRefundMinor: 301, bonusRefundMinor: 200 },
		);
	});

	test("rejects over-refunds and money overflow", () => {
		assert.throws(
			() =>
				allocateRefund({
					refundMinor: 1_001,
					refundableCashMinor: 600,
					refundableBonusMinor: 400,
				}),
			(error) =>
				error instanceof MoneyRuleError && error.code === "INVALID_ALLOCATION",
		);
		assert.throws(
			() => checkedAdd(Number.MAX_SAFE_INTEGER, 1),
			(error) =>
				error instanceof MoneyRuleError && error.code === "MONEY_OVERFLOW",
		);
	});
});
