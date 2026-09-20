import { useEffect, useState } from "react";
import { z } from "zod";

import { useLocalStorage } from "#/components/shared/local-storage-provider";
import {
	type RegistrationFormInput,
	supportedCurrencies,
} from "#/lib/schemas/auth.schema";

export const registrationDraftKey = "bearbet:register-draft:v1";

const registrationDraftSchema = z.object({
	firstName: z.string().max(80).optional(),
	lastName: z.string().max(80).optional(),
	promoCode: z.string().max(64).optional(),
	username: z.string().max(30).optional(),
	email: z.string().max(320).optional(),
	dateOfBirth: z.string().optional(),
	countryCode: z
		.string()
		.regex(/^[A-Z]{2}$/, "Country code must contain two uppercase letters")
		.optional(),
	currencyCode: z.enum(supportedCurrencies).optional(),
	step: z.number().int().min(0).max(2).optional(),
});

export type RegistrationDraft = z.infer<typeof registrationDraftSchema>;

type UseRegistrationDraftStorageOptions = {
	draft: RegistrationDraft;
	hasDraft: (draft: RegistrationDraft) => boolean;
	onRestore: (draft: RegistrationDraft) => void;
};

export function useRegistrationDraftStorage({
	draft,
	hasDraft,
	onRestore,
}: UseRegistrationDraftStorageOptions) {
	const storage = useLocalStorage();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const rawDraft = storage.getItem(registrationDraftKey);
		if (rawDraft) {
			try {
				const parsedDraft = registrationDraftSchema.safeParse(
					JSON.parse(rawDraft),
				);
				if (parsedDraft.success) onRestore(parsedDraft.data);
			} catch {
				// Ignore malformed drafts and start with a clean form.
			}
		}
		setReady(true);
	}, [onRestore, storage]);

	useEffect(() => {
		if (!ready) return;

		if (!hasDraft(draft)) {
			storage.removeItem(registrationDraftKey);
			return;
		}

		storage.setItem(registrationDraftKey, JSON.stringify(draft));
	}, [draft, hasDraft, ready, storage]);
}

export type RegistrationDraftValues = Omit<
	Pick<
		RegistrationFormInput,
		| "firstName"
		| "lastName"
		| "username"
		| "email"
		| "dateOfBirth"
		| "countryCode"
		| "currencyCode"
	>,
	"currencyCode"
> & {
	currencyCode: (typeof supportedCurrencies)[number];
};
