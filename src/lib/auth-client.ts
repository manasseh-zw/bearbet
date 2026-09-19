import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type {
	ChangePasswordFormInput,
	ForgotPasswordFormInput,
	LoginFormInput,
	PasswordResetFormInput,
	RegisterPlayerInput,
} from "#/lib/schemas/auth.schema";

export const authClient = createAuthClient({
	plugins: [usernameClient(), adminClient()],
});

type SignUpEmailInput = Parameters<typeof authClient.signUp.email>[0];

export async function registerPlayer(input: RegisterPlayerInput) {
	const request: SignUpEmailInput & RegisterPlayerInput = {
		...input,
		name: `${input.firstName} ${input.lastName}`,
	};
	const result = await authClient.signUp.email(request);

	if (result.error) {
		throw new Error(result.error.message || "We could not create your account");
	}

	return result.data;
}

export async function signInPlayer({ identifier, password }: LoginFormInput) {
	const result = identifier.includes("@")
		? await authClient.signIn.email({ email: identifier, password })
		: await authClient.signIn.username({ username: identifier, password });

	if (result.error) {
		throw new Error(result.error.message || "We could not sign you in");
	}

	return result.data;
}

export async function signOutPlayer() {
	const result = await authClient.signOut();

	if (result.error) {
		throw new Error(result.error.message || "We could not sign you out");
	}

	return result.data;
}

export async function requestPasswordReset({ email }: ForgotPasswordFormInput) {
	const result = await authClient.requestPasswordReset({
		email,
		redirectTo: `${window.location.origin}/reset-password`,
	});

	if (result.error) {
		throw new Error(
			result.error.message ||
				"We could not start the password reset. Please try again.",
		);
	}

	return result.data;
}

export async function resetPassword({
	password,
	token,
}: PasswordResetFormInput & { token: string }) {
	const result = await authClient.resetPassword({
		newPassword: password,
		token,
	});

	if (result.error) {
		throw new Error(
			result.error.message ||
				"We could not reset your password. The link may have expired.",
		);
	}

	return result.data;
}

export async function changePassword({
	currentPassword,
	password,
}: ChangePasswordFormInput) {
	const result = await authClient.changePassword({
		currentPassword,
		newPassword: password,
		revokeOtherSessions: true,
	});

	if (result.error) {
		throw new Error(
			result.error.message || "We could not change your password.",
		);
	}

	return result.data;
}
