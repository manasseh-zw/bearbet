import { createFileRoute } from "@tanstack/react-router";

import { RegisterForm } from "#/components/auth/register-form";
import { getInternalRedirect } from "#/lib/navigation";

export const Route = createFileRoute("/_guest/register")({
	validateSearch: (search): { redirect?: string } => {
		const redirect = getInternalRedirect(search.redirect);
		return redirect ? { redirect } : {};
	},
	head: () => ({ meta: [{ title: "Create account | BearBet" }] }),
	component: RegisterPage,
});

function RegisterPage() {
	const { redirect } = Route.useSearch();
	return <RegisterForm redirectTo={redirect} />;
}
