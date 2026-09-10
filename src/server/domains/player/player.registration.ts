import "@tanstack/react-start/server-only";

import {
	type RegisterPlayerInput,
	registerPlayerInputSchema,
} from "#/lib/types/auth";
import { auth } from "#/server/infra/auth/auth";

type SignUpEmailInput = NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>;
type SignUpEmailBody = SignUpEmailInput["body"];

export async function registerPlayer(input: RegisterPlayerInput) {
	const registration = registerPlayerInputSchema.parse(input);
	const body: SignUpEmailBody & RegisterPlayerInput = {
		...registration,
		name: `${registration.firstName} ${registration.lastName}`,
	};

	return auth.api.signUpEmail({ body });
}
