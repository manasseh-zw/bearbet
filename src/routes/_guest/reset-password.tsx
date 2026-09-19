import { createFileRoute } from "@tanstack/react-router";

import { ResetPasswordForm } from "#/components/auth/reset-password-form";

export const Route = createFileRoute("/_guest/reset-password")({
	validateSearch: (search): { error?: string; token?: string } => ({
		error: typeof search.error === "string" ? search.error : undefined,
		token: typeof search.token === "string" ? search.token : undefined,
	}),
	head: () => ({ meta: [{ title: "Reset password | BearBet" }] }),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { error, token } = Route.useSearch();
	return <ResetPasswordForm error={error} token={token} />;
}
