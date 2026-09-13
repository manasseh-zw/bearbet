import { createFileRoute } from "@tanstack/react-router";

import { LoginForm } from "#/components/auth/login-form";
import { getInternalRedirect } from "#/lib/navigation";

export const Route = createFileRoute("/_guest/login")({
	validateSearch: (search): { redirect?: string } => {
		const redirect = getInternalRedirect(search.redirect);
		return redirect ? { redirect } : {};
	},
	head: () => ({ meta: [{ title: "Sign in | BearBet" }] }),
	component: LoginPage,
});

function LoginPage() {
	const { redirect } = Route.useSearch();
	return <LoginForm redirectTo={redirect} />;
}
