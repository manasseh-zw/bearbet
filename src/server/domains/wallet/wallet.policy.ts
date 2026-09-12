export type WalletBalances = {
	cashBalanceMinor: number;
	bonusBalanceMinor: number;
	reservedCashMinor: number;
};

export type StakeAllocation = {
	cashStakeMinor: number;
	bonusStakeMinor: number;
	wageringContributionMinor: number;
	balances: WalletBalances;
};

export type WinAllocation = {
	cashWinMinor: number;
	bonusWinMinor: number;
};

export type RefundAllocation = {
	cashRefundMinor: number;
	bonusRefundMinor: number;
};

export class MoneyRuleError extends Error {
	constructor(
		message: string,
		readonly code:
			| "INVALID_AMOUNT"
			| "INSUFFICIENT_FUNDS"
			| "MONEY_OVERFLOW"
			| "INVALID_ALLOCATION",
	) {
		super(message);
		this.name = "MoneyRuleError";
	}
}

export function assertMinorUnits(value: number, label = "Amount") {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new MoneyRuleError(
			`${label} must be a non-negative safe integer`,
			"INVALID_AMOUNT",
		);
	}
	return value;
}

export function assertPositiveMinorUnits(value: number, label = "Amount") {
	assertMinorUnits(value, label);
	if (value === 0) {
		throw new MoneyRuleError(
			`${label} must be greater than zero`,
			"INVALID_AMOUNT",
		);
	}
	return value;
}

export function checkedAdd(left: number, right: number) {
	assertMinorUnits(left, "Balance");
	if (!Number.isSafeInteger(right)) {
		throw new MoneyRuleError(
			"Movement must be a safe integer",
			"INVALID_AMOUNT",
		);
	}
	const result = left + right;
	if (!Number.isSafeInteger(result)) {
		throw new MoneyRuleError(
			"Money value exceeds the safe integer limit",
			"MONEY_OVERFLOW",
		);
	}
	if (result < 0) {
		throw new MoneyRuleError(
			"Wallet has insufficient funds",
			"INSUFFICIENT_FUNDS",
		);
	}
	return result;
}

export function playableBalance(balances: WalletBalances) {
	return checkedAdd(balances.cashBalanceMinor, balances.bonusBalanceMinor);
}

export function allocateStake(input: {
	stakeMinor: number;
	balances: WalletBalances;
	isBonusEligible: boolean;
}): StakeAllocation {
	const stakeMinor = assertPositiveMinorUnits(input.stakeMinor, "Stake");
	validateBalances(input.balances);

	const bonusStakeMinor = input.isBonusEligible
		? Math.min(input.balances.bonusBalanceMinor, stakeMinor)
		: 0;
	const cashStakeMinor = stakeMinor - bonusStakeMinor;

	if (cashStakeMinor > input.balances.cashBalanceMinor) {
		throw new MoneyRuleError(
			"Wallet has insufficient playable funds",
			"INSUFFICIENT_FUNDS",
		);
	}

	return {
		cashStakeMinor,
		bonusStakeMinor,
		wageringContributionMinor: bonusStakeMinor,
		balances: {
			...input.balances,
			cashBalanceMinor: input.balances.cashBalanceMinor - cashStakeMinor,
			bonusBalanceMinor: input.balances.bonusBalanceMinor - bonusStakeMinor,
		},
	};
}

export function allocateWin(input: {
	winMinor: number;
	cashStakeMinor: number;
	bonusStakeMinor: number;
}): WinAllocation {
	const winMinor = assertMinorUnits(input.winMinor, "Win");
	const cashStakeMinor = assertMinorUnits(input.cashStakeMinor, "Cash stake");
	const bonusStakeMinor = assertMinorUnits(
		input.bonusStakeMinor,
		"Bonus stake",
	);
	const totalStakeMinor = checkedAdd(cashStakeMinor, bonusStakeMinor);

	if (totalStakeMinor === 0) {
		throw new MoneyRuleError(
			"A win needs an original stake allocation",
			"INVALID_ALLOCATION",
		);
	}

	const bonusWinMinor = proportionalFloor(
		winMinor,
		bonusStakeMinor,
		totalStakeMinor,
	);
	return {
		bonusWinMinor,
		cashWinMinor: winMinor - bonusWinMinor,
	};
}

export function allocateRefund(input: {
	refundMinor: number;
	refundableCashMinor: number;
	refundableBonusMinor: number;
}): RefundAllocation {
	const refundMinor = assertPositiveMinorUnits(input.refundMinor, "Refund");
	const refundableCashMinor = assertMinorUnits(
		input.refundableCashMinor,
		"Refundable cash",
	);
	const refundableBonusMinor = assertMinorUnits(
		input.refundableBonusMinor,
		"Refundable bonus",
	);
	const refundableMinor = checkedAdd(refundableCashMinor, refundableBonusMinor);

	if (refundMinor > refundableMinor) {
		throw new MoneyRuleError(
			"Refund exceeds the unrefunded operation amount",
			"INVALID_ALLOCATION",
		);
	}

	if (refundMinor === refundableMinor) {
		return {
			cashRefundMinor: refundableCashMinor,
			bonusRefundMinor: refundableBonusMinor,
		};
	}

	const bonusRefundMinor = proportionalFloor(
		refundMinor,
		refundableBonusMinor,
		refundableMinor,
	);
	return {
		bonusRefundMinor,
		cashRefundMinor: refundMinor - bonusRefundMinor,
	};
}

function proportionalFloor(
	amount: number,
	numerator: number,
	denominator: number,
) {
	return Number((BigInt(amount) * BigInt(numerator)) / BigInt(denominator));
}

function validateBalances(balances: WalletBalances) {
	assertMinorUnits(balances.cashBalanceMinor, "Cash balance");
	assertMinorUnits(balances.bonusBalanceMinor, "Bonus balance");
	assertMinorUnits(balances.reservedCashMinor, "Reserved cash balance");
}
