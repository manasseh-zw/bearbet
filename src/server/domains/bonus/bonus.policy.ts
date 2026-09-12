import {
	assertMinorUnits,
	assertPositiveMinorUnits,
	checkedAdd,
} from "#/server/domains/wallet/wallet.policy";

export type BonusAwardStatus =
	| "active"
	| "completed"
	| "exhausted"
	| "expired"
	| "cancelled";

export function calculateRequiredWager(
	awardedAmountMinor: number,
	wageringMultiplier: number,
) {
	assertPositiveMinorUnits(awardedAmountMinor, "Award amount");
	if (!Number.isSafeInteger(wageringMultiplier) || wageringMultiplier < 1) {
		throw new Error("Wagering multiplier must be a positive integer");
	}
	const required = BigInt(awardedAmountMinor) * BigInt(wageringMultiplier);
	if (required > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new Error("Required wager exceeds the safe integer limit");
	}
	return Number(required);
}

export function advanceWagering(input: {
	completedWagerMinor: number;
	requiredWagerMinor: number;
	contributionMinor: number;
}) {
	const completed = assertMinorUnits(
		input.completedWagerMinor,
		"Completed wager",
	);
	const required = assertPositiveMinorUnits(
		input.requiredWagerMinor,
		"Required wager",
	);
	const contribution = assertMinorUnits(
		input.contributionMinor,
		"Contribution",
	);
	if (completed > required) {
		throw new Error("Completed wager cannot exceed required wager");
	}
	return Math.min(required, checkedAdd(completed, contribution));
}

export function reverseWagering(input: {
	completedWagerMinor: number;
	reversalMinor: number;
}) {
	const completed = assertMinorUnits(
		input.completedWagerMinor,
		"Completed wager",
	);
	const reversal = assertMinorUnits(input.reversalMinor, "Wager reversal");
	return Math.max(0, completed - reversal);
}

export function determineActiveAwardOutcome(input: {
	completedWagerMinor: number;
	requiredWagerMinor: number;
	bonusBalanceMinor: number;
	unsettledOperationCount: number;
	expiresAt: Date;
	now: Date;
}): BonusAwardStatus {
	assertMinorUnits(input.completedWagerMinor, "Completed wager");
	assertPositiveMinorUnits(input.requiredWagerMinor, "Required wager");
	assertMinorUnits(input.bonusBalanceMinor, "Bonus balance");
	if (
		!Number.isSafeInteger(input.unsettledOperationCount) ||
		input.unsettledOperationCount < 0
	) {
		throw new Error("Unsettled operation count must be a non-negative integer");
	}

	if (input.now >= input.expiresAt) return "expired";
	if (
		input.completedWagerMinor >= input.requiredWagerMinor &&
		input.unsettledOperationCount === 0
	) {
		return "completed";
	}
	if (input.bonusBalanceMinor === 0 && input.unsettledOperationCount === 0) {
		return "exhausted";
	}
	return "active";
}

export function isGameEligible(input: {
	gameId: string;
	category?: string;
	provider?: string;
	eligibleGameIds: string[];
	eligibleCategories: string[];
	eligibleProviders: string[];
}) {
	const restrictions = [
		input.eligibleGameIds.length > 0,
		input.eligibleCategories.length > 0,
		input.eligibleProviders.length > 0,
	];
	if (!restrictions.some(Boolean)) return true;

	return (
		input.eligibleGameIds.includes(input.gameId) ||
		(input.category !== undefined &&
			input.eligibleCategories.includes(input.category)) ||
		(input.provider !== undefined &&
			input.eligibleProviders.includes(input.provider))
	);
}
