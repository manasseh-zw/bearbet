import { createFileRoute } from "@tanstack/react-router";

import { ChangePasswordForm } from "#/components/auth/change-password-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_app/_player/profile")({
	head: () => ({ meta: [{ title: "Profile | BearBet" }] }),
	component: ProfilePage,
});

function ProfilePage() {
	return (
		<main className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
			<div>
				<p className="text-sm font-medium text-primary">Account</p>
				<h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile</h1>
				<p className="mt-2 text-muted-foreground">
					Manage your account security and password.
				</p>
			</div>

			<Card className="mt-8">
				<CardHeader>
					<CardTitle>Change password</CardTitle>
					<CardDescription>
						Use your current password to choose a new one. Other active sessions
						will be signed out.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ChangePasswordForm />
				</CardContent>
			</Card>
		</main>
	);
}
