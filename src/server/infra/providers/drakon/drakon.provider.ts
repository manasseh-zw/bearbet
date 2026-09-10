import "@tanstack/react-start/server-only";

import {
	type DrakonConfig,
	type DrakonGame,
	drakonAuthSchema,
	drakonCatalogueSchema,
	drakonLaunchSchema,
} from "#/server/infra/providers/drakon/drakon.types";
import type {
	CasinoProvider,
	LaunchGameInput,
	NormalizedGame,
} from "#/server/infra/providers/provider.types";

const REQUEST_TIMEOUT_MS = 20_000;

export type DrakonProvider = CasinoProvider & {
	fetchRawCatalogue: () => Promise<DrakonGame[]>;
};

export function createDrakonProvider(
	config: DrakonConfig,
	fetcher: typeof fetch = fetch,
): DrakonProvider {
	let accessToken: string | undefined;
	let authentication: Promise<string> | undefined;
	let catalogue: NormalizedGame[] | undefined;

	async function authenticate() {
		if (accessToken) return accessToken;
		if (!authentication) {
			authentication = requestAuthentication(config, fetcher).finally(() => {
				authentication = undefined;
			});
		}
		accessToken = await authentication;
		return accessToken;
	}

	async function request(path: string, params?: Record<string, string>) {
		const url = new URL(path, config.baseUrl);
		if (params) url.search = new URLSearchParams(params).toString();

		let response = await fetchWithTimeout(fetcher, url, {
			headers: {
				Authorization: `Bearer ${await authenticate()}`,
				Accept: "application/json",
			},
		});

		if (response.status === 401) {
			accessToken = undefined;
			response = await fetchWithTimeout(fetcher, url, {
				headers: {
					Authorization: `Bearer ${await authenticate()}`,
					Accept: "application/json",
				},
			});
		}

		return parseResponse(response);
	}

	return {
		async fetchRawCatalogue() {
			const parsed = drakonCatalogueSchema.safeParse(
				await request("games/all"),
			);
			if (!parsed.success)
				throw new Error("Drakon returned an invalid catalogue");
			return parsed.data.games;
		},

		async syncCatalogue() {
			catalogue = (await this.fetchRawCatalogue()).map(normalizeDrakonGame);
			return { games: catalogue };
		},

		async launchGame(input: LaunchGameInput) {
			const games = catalogue ?? (await this.syncCatalogue()).games;
			const game = games.find((candidate) => candidate.id === input.gameId);
			if (!game) throw new Error("Choose a game from the current catalogue");
			if (config.mode === "fun" && !game.supportsFun) {
				throw new Error(
					"This game does not support fun mode [FUN_MODE_NOT_AVAILABLE]",
				);
			}

			const parsed = drakonLaunchSchema.safeParse(
				await request("games/game_launch", {
					agent_code: config.agentCode,
					agent_token: config.agentToken,
					game_id: input.gameId,
					currency: input.currencyCode,
					lang: input.language ?? "en",
					user_id: input.userId,
					user_name: input.userName,
					type: "CHARGED",
					mode: config.mode,
				}),
			);
			if (!parsed.success) throw new Error("Drakon did not return a game URL");

			return { url: validateLaunchUrl(parsed.data.game_url, config.baseUrl) };
		},
	};
}

export function normalizeDrakonGame(game: DrakonGame): NormalizedGame {
	const rtp = typeof game.rtp === "number" ? game.rtp : Number(game.rtp);
	return {
		id: String(game.game_id),
		...(game.game_code != null ? { code: String(game.game_code) } : {}),
		name: game.game_name,
		provider: game.provider_game,
		...(game.game_type ? { type: game.game_type.trim().toLowerCase() } : {}),
		...(game.description ? { description: game.description } : {}),
		...(Number.isFinite(rtp) ? { rtp } : {}),
		...(game.banner?.startsWith("https://") ? { bannerUrl: game.banner } : {}),
		...(game.cover?.startsWith("https://") ? { coverUrl: game.cover } : {}),
		supportsFun:
			game.only_demo === true || game.only_demo === 1 || game.only_demo === "1",
		isAvailable:
			game.status === true || game.status === 1 || game.status === "1",
		isMobile:
			game.is_mobile === true || game.is_mobile === 1 || game.is_mobile === "1",
		hasFreeSpins:
			game.has_freespins === true ||
			game.has_freespins === 1 ||
			game.has_freespins === "1",
		hasLobby:
			game.has_lobby === true || game.has_lobby === 1 || game.has_lobby === "1",
		hasTables:
			game.has_tables === true ||
			game.has_tables === 1 ||
			game.has_tables === "1",
	};
}

async function requestAuthentication(
	config: DrakonConfig,
	fetcher: typeof fetch,
) {
	const credentials = Buffer.from(
		`${config.agentToken}:${config.agentSecret}`,
	).toString("base64");
	const response = await fetchWithTimeout(
		fetcher,
		new URL("auth/authentication", config.baseUrl),
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${credentials}`,
				Accept: "application/json",
			},
		},
	);
	const parsed = drakonAuthSchema.safeParse(await parseResponse(response));
	if (!parsed.success)
		throw new Error("Drakon authentication did not return an access token");
	return parsed.data.access_token;
}

async function fetchWithTimeout(
	fetcher: typeof fetch,
	url: URL,
	init: RequestInit,
) {
	try {
		return await fetcher(url, {
			...init,
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch (error) {
		if (
			error instanceof Error &&
			(error.name === "TimeoutError" || error.name === "TypeError")
		) {
			throw new Error("Could not reach Drakon");
		}
		throw error;
	}
}

async function parseResponse(
	response: Response,
): Promise<Record<string, unknown>> {
	let data: unknown;
	try {
		data = await response.json();
	} catch {
		throw new Error("Drakon returned a non-JSON response");
	}
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("Drakon returned an unexpected response");
	}
	const result = data as Record<string, unknown>;
	if (
		!response.ok ||
		result.ok === false ||
		result.status === false ||
		result.status === "error"
	) {
		const code =
			typeof result.error === "string" &&
			/^[A-Z][A-Z_]{1,64}$/.test(result.error)
				? ` [${result.error}]`
				: "";
		throw new Error(`Drakon returned HTTP ${response.status}${code}`);
	}
	return result;
}

function validateLaunchUrl(value: string, baseUrl: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("Drakon returned an invalid game URL");
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error("Drakon returned an unsupported game URL");
	}
	const providerUrl = new URL(baseUrl);
	if (
		url.hostname === providerUrl.hostname &&
		url.pathname.replace(/\/$/, "") === "/game-error"
	) {
		throw new Error(
			"Drakon returned its unavailable game page [GAME_UNAVAILABLE]",
		);
	}
	return url.href;
}
