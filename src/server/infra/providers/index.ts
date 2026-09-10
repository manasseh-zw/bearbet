import "@tanstack/react-start/server-only";

import { env, getDrakonEnv } from "#/server/env";
import { createDrakonProvider } from "#/server/infra/providers/drakon/drakon.provider";
import { createFixtureProvider } from "#/server/infra/providers/fixture/fixture.provider";

export function createCasinoProvider() {
	if (env.CASINO_PROVIDER === "drakon") {
		return createDrakonProvider(getDrakonEnv());
	}

	return createFixtureProvider({
		delayMs: env.FIXTURE_PROVIDER_DELAY_MS,
		failure: env.FIXTURE_PROVIDER_FAILURE,
	});
}
