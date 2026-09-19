import { createFileRoute } from "@tanstack/react-router";

import { ForgotPasswordForm } from "#/components/auth/forgot-password-form";

export const Route = createFileRoute("/_guest/forgot-password")({
	head: () => ({ meta: [{ title: "Forgot password | BearBet" }] }),
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	return <ForgotPasswordForm />;
}
