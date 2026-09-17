import "@tanstack/react-start/server-only";

import { env, getBigBangEnv, getDrakonEnv } from "#/server/env";
import { createBigBangProvider } from "#/server/infra/providers/bigbang/bigbang.provider";
import { createDrakonProvider } from "#/server/infra/providers/drakon/drakon.provider";
import { createFixtureProvider } from "#/server/infra/providers/fixture/fixture.provider";

export function createCasinoProvider() {
	if (env.CASINO_PROVIDER === "drakon") {
		return createDrakonProvider(getDrakonEnv());
	}
	if (env.CASINO_PROVIDER === "bigbang") {
		return createBigBangProvider(getBigBangEnv());
	}

	return createFixtureProvider({
		delayMs: env.FIXTURE_PROVIDER_DELAY_MS,
		failure: env.FIXTURE_PROVIDER_FAILURE,
	});
}
