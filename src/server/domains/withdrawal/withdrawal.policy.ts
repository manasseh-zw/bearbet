import {
	assertPositiveMinorUnits,
	checkedAdd,
	type WalletBalances,
} from "#/server/domains/wallet/wallet.policy";

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export function reserveWithdrawal(
	balances: WalletBalances,
	requestedAmountMinor: number,
) {
	const amountMinor = assertPositiveMinorUnits(
		requestedAmountMinor,
		"Withdrawal amount",
	);
	return {
		...balances,
		cashBalanceMinor: checkedAdd(balances.cashBalanceMinor, -amountMinor),
		reservedCashMinor: checkedAdd(balances.reservedCashMinor, amountMinor),
	};
}

export function reviewWithdrawal(input: {
	status: WithdrawalStatus;
	decision: "approve" | "reject";
	reservedAmountMinor: number;
	balances: WalletBalances;
}) {
	if (input.status !== "pending") {
		throw new Error("Only a pending withdrawal can be reviewed");
	}
	const amountMinor = assertPositiveMinorUnits(
		input.reservedAmountMinor,
		"Reserved amount",
	);
	const reservedCashMinor = checkedAdd(
		input.balances.reservedCashMinor,
		-amountMinor,
	);

	if (input.decision === "approve") {
		return {
			status: "approved" as const,
			balances: { ...input.balances, reservedCashMinor },
		};
	}
	return {
		status: "rejected" as const,
		balances: {
			...input.balances,
			cashBalanceMinor: checkedAdd(
				input.balances.cashBalanceMinor,
				amountMinor,
			),
			reservedCashMinor,
		},
	};
}
