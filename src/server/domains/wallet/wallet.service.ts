import "@tanstack/react-start/server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import {
	assertMinorUnits,
	checkedAdd,
	playableBalance,
	type WalletBalances,
} from "#/server/domains/wallet/wallet.policy";
import {
	type ApplyWalletOperationCommand,
	type ApplyWalletOperationInput,
	applyWalletOperationSchema,
	type DemoTopUpInput,
	demoTopUpSchema,
	type WalletMovement,
} from "#/server/domains/wallet/wallet.schema";
import { db } from "#/server/infra/db";
import {
	ledgerEntry,
	user,
	wallet,
	walletOperation,
} from "#/server/infra/db/schema";

export { DEMO_TOP_UP_AMOUNTS_MINOR } from "#/server/domains/wallet/wallet.schema";

type WalletBucket = WalletMovement["bucket"];
export type DatabaseTransaction = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export type {
	ApplyWalletOperationInput,
	WalletMovement,
} from "#/server/domains/wallet/wallet.schema";

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
	const command = parseWalletOperation(input);
	const fingerprint = operationFingerprint(command);

	const [currentWallet] = await transaction
		.select()
		.from(wallet)
		.where(eq(wallet.playerId, command.playerId))
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
		.where(eq(walletOperation.idempotencyKey, command.idempotencyKey));

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
	const entries = command.movements.map((movement, movementIndex) => {
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
			type: command.type,
			idempotencyKey: command.idempotencyKey,
			fingerprint,
			sourceType: command.sourceType,
			sourceId: command.sourceId,
			actorUserId: command.actorUserId,
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
			type: command.type,
			idempotencyKey: `${command.idempotencyKey}:${entry.movementIndex}`,
			sourceType: command.sourceType,
			sourceId: command.sourceId,
			actorUserId: command.actorUserId,
		})),
	);

	await transaction
		.update(wallet)
		.set(balances)
		.where(eq(wallet.id, currentWallet.id));

	return operationResult(createdOperation, false);
}

export async function demoTopUp(input: DemoTopUpInput) {
	const result = demoTopUpSchema.safeParse(input);
	if (!result.success) {
		throw new WalletOperationError(
			result.error.issues[0]?.message ?? "Demo top-up is invalid",
			"INVALID_OPERATION",
		);
	}
	return applyWalletOperation({
		...result.data,
		type: "demo_top_up",
		movements: [{ bucket: "cash", amountMinor: result.data.amountMinor }],
		sourceType: "demo_top_up",
		sourceId: result.data.idempotencyKey,
	});
}

function parseWalletOperation(
	input: ApplyWalletOperationInput,
): ApplyWalletOperationCommand {
	const result = applyWalletOperationSchema.safeParse(input);
	if (!result.success) {
		throw new WalletOperationError(
			result.error.issues[0]?.message ?? "Wallet operation is invalid",
			"INVALID_OPERATION",
		);
	}
	return result.data;
}

function operationFingerprint(input: ApplyWalletOperationCommand) {
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
