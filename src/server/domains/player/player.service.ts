import "@tanstack/react-start/server-only";

import { and, eq } from "drizzle-orm";

import {
	type PlayerProfile,
	playerProfileInputSchema,
} from "#/lib/schemas/auth.schema";
import { db } from "#/server/infra/db";
import { ledgerEntry, player, user, wallet } from "#/server/infra/db/schema";

export const WELCOME_CREDIT_MINOR = 100_000;

export type RegisterPlayerInput = PlayerProfile & {
	userId: string;
};

export class PlayerServiceError extends Error {
	constructor(
		message: string,
		readonly code: "PLAYER_UNAVAILABLE",
	) {
		super(message);
		this.name = "PlayerServiceError";
	}
}

export async function getActivePlayerAccountDetails(playerId: string) {
	const [account] = await db
		.select({
			email: user.email,
			name: user.name,
			createdAt: user.createdAt,
		})
		.from(user)
		.innerJoin(player, eq(player.userId, user.id))
		.where(and(eq(user.id, playerId), eq(user.banned, false)));
	if (!account) {
		throw new PlayerServiceError(
			"Active player was not found",
			"PLAYER_UNAVAILABLE",
		);
	}
	return account;
}

export async function registerPlayer(input: RegisterPlayerInput) {
	const profile = playerProfileInputSchema.parse(input);
	const idempotencyKey = `player:${input.userId}:welcome-credit`;

	return db.transaction(async (transaction) => {
		await transaction
			.insert(player)
			.values({
				userId: input.userId,
				firstName: profile.firstName,
				lastName: profile.lastName,
				dateOfBirth: profile.dateOfBirth,
				countryCode: profile.countryCode,
			})
			.onConflictDoNothing({ target: player.userId });

		await transaction
			.insert(wallet)
			.values({
				playerId: input.userId,
				currencyCode: profile.currencyCode,
			})
			.onConflictDoNothing({ target: wallet.playerId });

		const [currentWallet] = await transaction
			.select()
			.from(wallet)
			.where(eq(wallet.playerId, input.userId))
			.for("update");

		if (!currentWallet) {
			throw new Error("Player wallet was not created");
		}

		const nextCashBalance =
			currentWallet.cashBalanceMinor + WELCOME_CREDIT_MINOR;
		const [welcomeEntry] = await transaction
			.insert(ledgerEntry)
			.values({
				walletId: currentWallet.id,
				bucket: "cash",
				type: "welcome_credit",
				amountMinor: WELCOME_CREDIT_MINOR,
				balanceBeforeMinor: currentWallet.cashBalanceMinor,
				balanceAfterMinor: nextCashBalance,
				idempotencyKey,
				sourceType: "player",
				sourceId: input.userId,
			})
			.onConflictDoNothing({ target: ledgerEntry.idempotencyKey })
			.returning({ id: ledgerEntry.id });

		if (welcomeEntry) {
			await transaction
				.update(wallet)
				.set({ cashBalanceMinor: nextCashBalance })
				.where(eq(wallet.id, currentWallet.id));
		}

		const [provisionedPlayer] = await transaction
			.select()
			.from(player)
			.where(eq(player.userId, input.userId));

		const [provisionedWallet] = await transaction
			.select()
			.from(wallet)
			.where(eq(wallet.id, currentWallet.id));

		if (!provisionedPlayer || !provisionedWallet) {
			throw new Error("Player provisioning did not complete");
		}

		return {
			player: provisionedPlayer,
			wallet: provisionedWallet,
		};
	});
}
