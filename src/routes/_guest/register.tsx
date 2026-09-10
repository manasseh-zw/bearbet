import { createFileRoute } from "@tanstack/react-router";

import { RegisterForm } from "#/components/auth/register-form";

export const Route = createFileRoute("/_guest/register")({
	head: () => ({ meta: [{ title: "Create account | BearBet" }] }),
	component: RegisterPage,
});

function RegisterPage() {
	return <RegisterForm />;
}
