import "@tanstack/react-start/server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { DatabaseTransaction } from "#/server/domains/wallet/wallet.service";
import { providerOperation } from "#/server/infra/db/schema";

export async function countUnsettledAwardBets(
	transaction: DatabaseTransaction,
	awardId: string,
) {
	const bets = await transaction
		.select({
			id: providerOperation.id,
			amountMinor: providerOperation.amountMinor,
			refundedCashMinor: providerOperation.refundedCashMinor,
			refundedBonusMinor: providerOperation.refundedBonusMinor,
		})
		.from(providerOperation)
		.where(
			and(
				eq(providerOperation.type, "bet"),
				eq(providerOperation.bonusAwardId, awardId),
			),
		);
	if (bets.length === 0) return 0;

	const children = await transaction
		.select({ originalOperationId: providerOperation.originalOperationId })
		.from(providerOperation)
		.where(
			and(
				inArray(
					providerOperation.originalOperationId,
					bets.map((bet) => bet.id),
				),
				eq(providerOperation.type, "win"),
			),
		);
	const settledIds = new Set(
		children.flatMap((row) =>
			row.originalOperationId ? [row.originalOperationId] : [],
		),
	);
	return bets.filter(
		(bet) =>
			bet.refundedCashMinor + bet.refundedBonusMinor < bet.amountMinor &&
			!settledIds.has(bet.id),
	).length;
}

export async function calculateAwardWageringProgress(
	transaction: DatabaseTransaction,
	awardId: string,
	requiredWagerMinor: number,
) {
	const bets = await transaction
		.select({
			wageringContributionMinor: providerOperation.wageringContributionMinor,
			refundedBonusMinor: providerOperation.refundedBonusMinor,
		})
		.from(providerOperation)
		.where(
			and(
				eq(providerOperation.type, "bet"),
				eq(providerOperation.bonusAwardId, awardId),
			),
		);
	const total = bets.reduce(
		(sum, bet) =>
			sum +
			BigInt(bet.wageringContributionMinor) -
			BigInt(bet.refundedBonusMinor),
		0n,
	);
	return Number(
		BigInt(requiredWagerMinor) < total ? requiredWagerMinor : total,
	);
}
