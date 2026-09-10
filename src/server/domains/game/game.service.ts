import "@tanstack/react-start/server-only";

import { createCasinoProvider } from "#/server/infra/providers";
import type { CasinoProvider } from "#/server/infra/providers/provider.types";

const casinoProvider = createCasinoProvider();

export async function listGames(provider: CasinoProvider = casinoProvider) {
	const catalogue = await provider.syncCatalogue();
	return catalogue.games;
}
