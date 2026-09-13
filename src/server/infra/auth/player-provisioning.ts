import "@tanstack/react-start/server-only";

import { eq } from "drizzle-orm";

import type { PlayerProfile } from "#/lib/schemas/auth.schema";
import { registerPlayer } from "#/server/domains/player/player.service";
import { db } from "#/server/infra/db";
import { user } from "#/server/infra/db/schema";

type ProvisionPlayerInput = PlayerProfile & { userId: string };

type ProvisionPlayerDependencies = {
	register: (input: ProvisionPlayerInput) => Promise<unknown>;
	deleteIdentity: (userId: string) => Promise<void>;
};

const defaultDependencies: ProvisionPlayerDependencies = {
	register: registerPlayer,
	deleteIdentity: async (userId) => {
		await db.delete(user).where(eq(user.id, userId));
	},
};

export async function provisionNewPlayer(
	input: ProvisionPlayerInput,
	dependencies: Partial<ProvisionPlayerDependencies> = {},
) {
	const resolved = { ...defaultDependencies, ...dependencies };
	try {
		return await resolved.register(input);
	} catch (provisioningError) {
		try {
			await resolved.deleteIdentity(input.userId);
		} catch (cleanupError) {
			throw new AggregateError(
				[provisioningError, cleanupError],
				"Player provisioning and identity cleanup both failed",
			);
		}
		throw provisioningError;
	}
}
