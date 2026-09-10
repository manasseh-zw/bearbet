import { createServerFn } from "@tanstack/react-start";

import { listGames } from "#/server/domains/game/game.service";

export const getGames = createServerFn({ method: "GET" }).handler(() =>
	listGames(),
);
