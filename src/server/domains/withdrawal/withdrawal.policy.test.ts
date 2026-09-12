import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { MoneyRuleError } from "#/server/domains/wallet/wallet.policy";
import { reserveWithdrawal, reviewWithdrawal } from "./withdrawal.policy";

const balances = {
	cashBalanceMinor: 70_000,
	bonusBalanceMinor: 10_000,
	reservedCashMinor: 0,
};

describe("withdrawal policy", () => {
	test("reserves cash without touching bonus funds", () => {
		assert.deepEqual(reserveWithdrawal(balances, 20_000), {
			cashBalanceMinor: 50_000,
			bonusBalanceMinor: 10_000,
			reservedCashMinor: 20_000,
		});
	});

	test("rejects a withdrawal larger than available cash", () => {
		assert.throws(
			() => reserveWithdrawal(balances, 70_001),
			(error) =>
				error instanceof MoneyRuleError && error.code === "INSUFFICIENT_FUNDS",
		);
	});

	test("approval consumes reserved cash and rejection releases it", () => {
		const reserved = reserveWithdrawal(balances, 20_000);
		assert.deepEqual(
			reviewWithdrawal({
				status: "pending",
				decision: "approve",
				reservedAmountMinor: 20_000,
				balances: reserved,
			}),
			{
				status: "approved",
				balances: { ...balances, cashBalanceMinor: 50_000 },
			},
		);
		assert.deepEqual(
			reviewWithdrawal({
				status: "pending",
				decision: "reject",
				reservedAmountMinor: 20_000,
				balances: reserved,
			}),
			{ status: "rejected", balances },
		);
	});

	test("prevents a second decision", () => {
		assert.throws(() =>
			reviewWithdrawal({
				status: "approved",
				decision: "reject",
				reservedAmountMinor: 20_000,
				balances: { ...balances, reservedCashMinor: 20_000 },
			}),
		);
	});
});
