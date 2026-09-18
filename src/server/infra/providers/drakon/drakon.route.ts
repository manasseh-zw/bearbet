import { findGame } from "#/server/domains/game/game.service";
import {
	GameplayServiceError,
	recordBet,
	recordRefund,
	recordWin,
} from "#/server/domains/gameplay/gameplay.service";
import {
	getActivePlayerAccountDetails,
	PlayerServiceError,
} from "#/server/domains/player/player.service";
import {
	getPlayableBalance,
	WalletOperationError,
} from "#/server/domains/wallet/wallet.service";
import { getDrakonEnv } from "#/server/env";
import {
	DrakonWebhookError,
	parseDrakonWebhook,
} from "#/server/infra/providers/drakon/drakon.webhook";

export async function handleDrakonWebhook(request: Request, key: string) {
	try {
		const callback = await parseDrakonWebhook(request, key, getDrakonEnv());
		if (callback.isDashboardProbe) {
			return json({ status: true, balance: 1000 });
		}

		switch (callback.kind) {
			case "accountDetails": {
				const account = await getActivePlayerAccountDetails(callback.userId);
				return json({
					status: true,
					email: account.email,
					name_jogador: account.name,
					date: account.createdAt.toISOString(),
				});
			}
			case "balance": {
				const result = await getPlayableBalance(callback.userId);
				return json({
					status: 1,
					balance: minorToMajor(result.balanceMinor),
				});
			}
			case "bet": {
				const storedGame = await findGame("drakon", callback.gameId);
				const result = await recordBet({
					...gameplayIdentity(callback),
					amountMinor: callback.amountMinor,
					gameCategory: storedGame?.type,
					contentProvider: storedGame?.provider,
				});
				return transactionResponse(result.balanceMinor);
			}
			case "win": {
				const result = await recordWin({
					...gameplayIdentity(callback),
					betAmountMinor: callback.betAmountMinor,
					winAmountMinor: callback.winAmountMinor,
				});
				return transactionResponse(result.balanceMinor);
			}
			case "refund": {
				const result = await recordRefund({
					...gameplayIdentity(callback),
					amountMinor: callback.amountMinor,
				});
				return transactionResponse(result.balanceMinor);
			}
		}
	} catch (error) {
		if (error instanceof DrakonWebhookError) {
			return json(
				{ status: false, error: error.code },
				{ status: error.status },
			);
		}
		if (error instanceof GameplayServiceError) {
			return json({ status: false, error: error.code });
		}
		if (
			error instanceof PlayerServiceError ||
			error instanceof WalletOperationError
		) {
			return json({ status: false, error: "INVALID_USER" });
		}
		return json({ status: false, error: "INTERNAL_ERROR" }, { status: 500 });
	}
}

function gameplayIdentity(callback: {
	userId: string;
	transactionId: string;
	sessionId: string;
	roundId: string;
	gameId: string;
}) {
	return {
		integrationProvider: "drakon" as const,
		playerId: callback.userId,
		externalTransactionId: callback.transactionId,
		externalSessionId: callback.sessionId,
		externalRoundId: callback.roundId,
		gameId: callback.gameId,
	};
}

function transactionResponse(balanceMinor: number) {
	return json({ status: true, balance: minorToMajor(balanceMinor) });
}

function minorToMajor(amountMinor: number) {
	return amountMinor / 100;
}

function json(body: Record<string, unknown>, init?: ResponseInit) {
	return Response.json(body, {
		...init,
		headers: { "Cache-Control": "no-store", ...init?.headers },
	});
}
