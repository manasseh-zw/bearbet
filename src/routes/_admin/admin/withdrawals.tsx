import { createFileRoute } from "@tanstack/react-router";

import { WithdrawalsPage } from "#/components/admin/operations/withdrawals-page";
import { adminWithdrawalQuerySchema } from "#/lib/schemas/admin-operations.schema";

export const Route = createFileRoute("/_admin/admin/withdrawals")({
	validateSearch: (search) => {
		const parsed = adminWithdrawalQuerySchema.safeParse(search);
		return parsed.success ? parsed.data : adminWithdrawalQuerySchema.parse({});
	},
	head: () => ({ meta: [{ title: "Withdrawals | BearBet Admin" }] }),
	component: WithdrawalsRoute,
});

function WithdrawalsRoute() {
	const query = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<WithdrawalsPage
			query={query}
			onQueryChange={(search) =>
				navigate({ search, replace: true, resetScroll: false })
			}
		/>
	);
}
