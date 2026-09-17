import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getBigBangEnv } from "#/server/env";
import { createBigBangProvider } from "#/server/infra/providers/bigbang/bigbang.provider";

const launchDemoSchema = z.object({ gameId: z.number().int().positive() });

function bigBangSandbox() {
	return createBigBangProvider(getBigBangEnv());
}

export const getBigBangSandboxGames = createServerFn({ method: "GET" }).handler(
	() => bigBangSandbox().listSandboxGames(),
);

export const launchBigBangSandboxDemo = createServerFn({ method: "POST" })
	.validator(launchDemoSchema)
	.handler(({ data }) => bigBangSandbox().launchDemoGame(data.gameId));
