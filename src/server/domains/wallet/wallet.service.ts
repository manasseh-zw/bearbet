import "@tanstack/react-start/server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import {
	assertMinorUnits,
	assertPositiveMinorUnits,
	checkedAdd,
	playableBalance,
	type WalletBalances,
} from "#/server/domains/wallet/wallet.policy";
import { db } from "#/server/infra/db";
import {
	ledgerEntry,
	type ledgerEntryType,
	user,
	wallet,
	type walletBucket,
	walletOperation,
} from "#/server/infra/db/schema";

export const DEMO_TOP_UP_AMOUNTS_MINOR = [
	10_000, 50_000, 100_000, 1_000_000,
] as const;

type WalletBucket = (typeof walletBucket.enumValues)[number];
type LedgerEntryType = (typeof ledgerEntryType.enumValues)[number];
export type DatabaseTransaction = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export type WalletMovement = {
	bucket: WalletBucket;
	amountMinor: number;
};

export type ApplyWalletOperationInput = {
	playerId: string;
	type: LedgerEntryType;
	idempotencyKey: string;
	movements: readonly WalletMovement[];
	sourceType?: string;
	sourceId?: string;
	actorUserId?: string;
};

export class WalletOperationError extends Error {
	constructor(
		message: string,
		readonly code:
			| "INVALID_OPERATION"
			| "WALLET_NOT_FOUND"
			| "IDEMPOTENCY_CONFLICT",
	) {
		super(message);
		this.name = "WalletOperationError";
	}
}

export async function getPlayableBalance(playerId: string) {
	const [current] = await db
		.select({ wallet, banned: user.banned })
		.from(wallet)
		.innerJoin(user, eq(user.id, wallet.playerId))
		.where(eq(wallet.playerId, playerId));
	if (!current || current.banned) {
		throw new WalletOperationError(
			"Active player wallet was not found",
			"WALLET_NOT_FOUND",
		);
	}
	const balances: WalletBalances = {
		cashBalanceMinor: current.wallet.cashBalanceMinor,
		bonusBalanceMinor: current.wallet.bonusBalanceMinor,
		reservedCashMinor: current.wallet.reservedCashMinor,
	};
	return {
		currencyCode: current.wallet.currencyCode,
		balances,
		balanceMinor: playableBalance(balances),
	};
}

export async function applyWalletOperation(input: ApplyWalletOperationInput) {
	return db.transaction((transaction) =>
		applyWalletOperationInTransaction(transaction, input),
	);
}

export async function applyWalletOperationInTransaction(
	transaction: DatabaseTransaction,
	input: ApplyWalletOperationInput,
) {
	validateOperation(input);
	const fingerprint = operationFingerprint(input);

	const [currentWallet] = await transaction
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, input.playerId))
		.for("update");

	if (!currentWallet) {
		throw new WalletOperationError(
			"Player wallet was not found",
			"WALLET_NOT_FOUND",
		);
	}

	const [existing] = await transaction
		.select()
		.from(walletOperation)
		.where(eq(walletOperation.idempotencyKey, input.idempotencyKey));

	if (existing) {
		if (
			existing.walletId !== currentWallet.id ||
			existing.fingerprint !== fingerprint
		) {
			throw new WalletOperationError(
				"Idempotency key was already used for a different wallet operation",
				"IDEMPOTENCY_CONFLICT",
			);
		}
		return operationResult(existing, true);
	}

	let balances: WalletBalances = {
		cashBalanceMinor: currentWallet.cashBalanceMinor,
		bonusBalanceMinor: currentWallet.bonusBalanceMinor,
		reservedCashMinor: currentWallet.reservedCashMinor,
	};
	const entries = input.movements.map((movement, movementIndex) => {
		const balanceBeforeMinor = balanceForBucket(balances, movement.bucket);
		const balanceAfterMinor = checkedAdd(
			balanceBeforeMinor,
			movement.amountMinor,
		);
		balances = setBalanceForBucket(
			balances,
			movement.bucket,
			balanceAfterMinor,
		);
		return {
			movementIndex,
			bucket: movement.bucket,
			amountMinor: movement.amountMinor,
			balanceBeforeMinor,
			balanceAfterMinor,
		};
	});

	const [createdOperation] = await transaction
		.insert(walletOperation)
		.values({
			walletId: currentWallet.id,
			type: input.type,
			idempotencyKey: input.idempotencyKey,
			fingerprint,
			sourceType: input.sourceType,
			sourceId: input.sourceId,
			actorUserId: input.actorUserId,
			resultCashBalanceMinor: balances.cashBalanceMinor,
			resultBonusBalanceMinor: balances.bonusBalanceMinor,
			resultReservedCashMinor: balances.reservedCashMinor,
		})
		.returning();

	if (!createdOperation) {
		throw new WalletOperationError(
			"Wallet operation could not be recorded",
			"INVALID_OPERATION",
		);
	}

	await transaction.insert(ledgerEntry).values(
		entries.map((entry) => ({
			...entry,
			walletId: currentWallet.id,
			operationId: createdOperation.id,
			type: input.type,
			idempotencyKey: `${input.idempotencyKey}:${entry.movementIndex}`,
			sourceType: input.sourceType,
			sourceId: input.sourceId,
			actorUserId: input.actorUserId,
		})),
	);

	await transaction
		.update(wallet)
		.set(balances)
		.where(eq(wallet.id, currentWallet.id));

	return operationResult(createdOperation, false);
}

export async function demoTopUp(input: {
	playerId: string;
	amountMinor: number;
	idempotencyKey: string;
}) {
	if (
		!DEMO_TOP_UP_AMOUNTS_MINOR.includes(
			input.amountMinor as (typeof DEMO_TOP_UP_AMOUNTS_MINOR)[number],
		)
	) {
		throw new WalletOperationError(
			"Choose a supported demo top-up amount",
			"INVALID_OPERATION",
		);
	}
	return applyWalletOperation({
		...input,
		type: "demo_top_up",
		movements: [{ bucket: "cash", amountMinor: input.amountMinor }],
		sourceType: "demo_top_up",
		sourceId: input.idempotencyKey,
	});
}

function validateOperation(input: ApplyWalletOperationInput) {
	if (!input.playerId.trim() || !input.idempotencyKey.trim()) {
		throw new WalletOperationError(
			"Player and idempotency key are required",
			"INVALID_OPERATION",
		);
	}
	if (input.movements.length === 0) {
		throw new WalletOperationError(
			"A wallet operation needs at least one movement",
			"INVALID_OPERATION",
		);
	}
	for (const movement of input.movements) {
		assertPositiveMinorUnits(Math.abs(movement.amountMinor), "Movement");
		if (!Number.isSafeInteger(movement.amountMinor)) {
			throw new WalletOperationError(
				"Movement must be a safe integer",
				"INVALID_OPERATION",
			);
		}
	}
}

function operationFingerprint(input: ApplyWalletOperationInput) {
	return createHash("sha256")
		.update(
			JSON.stringify({
				playerId: input.playerId,
				type: input.type,
				movements: input.movements,
				sourceType: input.sourceType ?? null,
				sourceId: input.sourceId ?? null,
				actorUserId: input.actorUserId ?? null,
			}),
		)
		.digest("hex");
}

function operationResult(
	operation: typeof walletOperation.$inferSelect,
	isDuplicate: boolean,
) {
	return {
		operationId: operation.id,
		isDuplicate,
		balances: {
			cashBalanceMinor: operation.resultCashBalanceMinor,
			bonusBalanceMinor: operation.resultBonusBalanceMinor,
			reservedCashMinor: operation.resultReservedCashMinor,
		},
	};
}

function balanceForBucket(balances: WalletBalances, bucket: WalletBucket) {
	switch (bucket) {
		case "cash":
			return balances.cashBalanceMinor;
		case "bonus":
			return balances.bonusBalanceMinor;
		case "reserved_cash":
			return balances.reservedCashMinor;
	}
}

function setBalanceForBucket(
	balances: WalletBalances,
	bucket: WalletBucket,
	value: number,
): WalletBalances {
	assertMinorUnits(value, "Balance");
	switch (bucket) {
		case "cash":
			return { ...balances, cashBalanceMinor: value };
		case "bonus":
			return { ...balances, bonusBalanceMinor: value };
		case "reserved_cash":
			return { ...balances, reservedCashMinor: value };
	}
}
