import { createServerFn } from "@tanstack/react-start";

import {
	withdrawalRequestInputSchema,
	withdrawalReviewInputSchema,
} from "#/lib/schemas/withdrawal.schema";
import {
	requestWithdrawal,
	reviewWithdrawal,
} from "#/server/domains/withdrawal/withdrawal.service";
import {
	adminAuthMiddleware,
	playerAuthMiddleware,
} from "#/server/infra/auth/auth.middleware";

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

export const reviewAdminWithdrawal = createServerFn({ method: "POST" })
	.middleware([adminAuthMiddleware])
	.validator(withdrawalReviewInputSchema)
	.handler(async ({ context, data }) => {
		const result = await reviewWithdrawal({
			...data,
			reviewerUserId: context.session.user.id,
		});

		return {
			isDuplicate: result.isDuplicate,
			withdrawal: {
				id: result.withdrawal.id,
				currencyCode: result.withdrawal.currencyCode,
				requestedAmountMinor: result.withdrawal.requestedAmountMinor,
				reservedAmountMinor: result.withdrawal.reservedAmountMinor,
				status: result.withdrawal.status,
				reviewerUserId: result.withdrawal.reviewerUserId,
				reviewReason: result.withdrawal.reviewReason,
				reviewedAt: result.withdrawal.reviewedAt,
			},
		};
	});
