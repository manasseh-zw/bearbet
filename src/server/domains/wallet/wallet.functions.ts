import { createServerFn } from "@tanstack/react-start";

import {
	demoTopUpInputSchema,
	withdrawalRequestInputSchema,
} from "#/lib/schemas/wallet.schema";
import { playableBalance } from "#/server/domains/wallet/wallet.policy";
import {
	demoTopUp,
	getWalletOverview,
} from "#/server/domains/wallet/wallet.service";
import { requestWithdrawal } from "#/server/domains/withdrawal/withdrawal.service";
import { playerAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const getCurrentWallet = createServerFn({ method: "GET" })
	.middleware([playerAuthMiddleware])
	.handler(({ context }) => getWalletOverview(context.session.user.id));

export const addDemoFunds = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(demoTopUpInputSchema)
	.handler(async ({ context, data }) => {
		const result = await demoTopUp({
			...data,
			playerId: context.session.user.id,
		});

		return {
			...result,
			playableBalanceMinor: playableBalance(result.balances),
		};
	});

export const requestPlayerWithdrawal = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(withdrawalRequestInputSchema)
	.handler(({ context, data }) =>
		requestWithdrawal({
			...data,
			playerId: context.session.user.id,
		}),
	);
