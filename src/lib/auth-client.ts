import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { RegisterPlayerInput } from "#/lib/types/auth";

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
