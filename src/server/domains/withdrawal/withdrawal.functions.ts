import { createServerFn } from "@tanstack/react-start";

import { withdrawalRequestInputSchema } from "#/lib/schemas/withdrawal.schema";
import { requestWithdrawal } from "#/server/domains/withdrawal/withdrawal.service";
import { playerAuthMiddleware } from "#/server/infra/auth/auth.middleware";

export const requestPlayerWithdrawal = createServerFn({ method: "POST" })
	.middleware([playerAuthMiddleware])
	.validator(withdrawalRequestInputSchema)
	.handler(async ({ context, data }) => {
		const result = await requestWithdrawal({
			...data,
			playerId: context.session.user.id,
		});

		return {
			isDuplicate: result.isDuplicate,
			withdrawal: {
				id: result.withdrawal.id,
				currencyCode: result.withdrawal.currencyCode,
				requestedAmountMinor: result.withdrawal.requestedAmountMinor,
				reservedAmountMinor: result.withdrawal.reservedAmountMinor,
				status: result.withdrawal.status,
				requestedAt: result.withdrawal.requestedAt,
			},
		};
	});
