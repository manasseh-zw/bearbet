import "@tanstack/react-start/server-only";

import { z } from "zod";
import type {
	LaunchGameInput,
	NormalizedGame,
} from "#/server/infra/providers/provider.types";

const REQUEST_TIMEOUT_MS = 20_000;

const bigBangGameSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	title: z.string(),
	provider: z.string(),
	thumbnail: z.string().url().nullable(),
	category: z.string().optional(),
	category_title: z.string().optional(),
	game_type: z.enum(["slot", "live", "crash"]),
});

const bigBangGamesResponseSchema = z.object({
	success: z.literal(true),
	data: z.array(bigBangGameSchema),
});

const bigBangLaunchResponseSchema = z.object({
	success: z.literal(true),
	game_url: z.string().url(),
	game_id: z.number().int(),
	game_name: z.string(),
});

export type BigBangConfig = {
	baseUrl: string;
	sandboxKey: string;
};

export type BigBangSandboxGame = z.infer<typeof bigBangGameSchema>;

export type BigBangSandboxLaunch = {
	gameId: number;
	gameName: string;
	url: string;
};

export function createBigBangProvider(
	config: BigBangConfig,
	fetcher: typeof fetch = fetch,
) {
	const endpointBase = new URL(config.baseUrl);
	endpointBase.pathname = endpointBase.pathname.endsWith("/")
		? endpointBase.pathname
		: `${endpointBase.pathname}/`;
	const endpointPrefix = endpointBase.pathname.endsWith("/api/v1/")
		? ""
		: "api/v1/";

	async function request(path: string, init?: RequestInit) {
		let response: Response;
		try {
			response = await fetcher(
				new URL(`${endpointPrefix}${path}`, endpointBase),
				{
					...init,
					headers: {
						Accept: "application/json",
						"X-API-Key": config.sandboxKey,
						...init?.headers,
					},
					signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				},
			);
		} catch (error) {
			if (error instanceof Error && error.name === "TimeoutError") {
				throw new Error("BigBang did not respond before the request timed out");
			}
			throw new Error("Could not reach the BigBang sandbox");
		}

		let body: unknown;
		try {
			body = await response.json();
		} catch {
			throw new Error("BigBang returned a non-JSON response");
		}

		if (!response.ok) {
			throw new Error(`BigBang returned HTTP ${response.status}`);
		}
		return body;
	}

	return {
		async syncCatalogue() {
			const result = bigBangGamesResponseSchema.safeParse(
				await request("games?type=standard&limit=5000"),
			);
			if (!result.success)
				throw new Error("BigBang returned an invalid game catalogue");
			const games: NormalizedGame[] = result.data.data.map((game) => ({
				id: String(game.id),
				code: game.name,
				name: game.title,
				provider: game.provider,
				type: game.game_type,
				coverUrl: game.thumbnail ?? undefined,
				supportsFun: true,
				isAvailable: true,
				isMobile: true,
				hasFreeSpins: false,
				hasLobby: false,
				hasTables: game.game_type === "live",
			}));
			return { games };
		},

		async launchGame(input: LaunchGameInput) {
			if (input.currencyCode !== "USD") {
				throw new Error(
					"BigBang sandbox launch currently supports BearBet USD wallets only",
				);
			}
			await request("users/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					user_token: input.userId,
					username: input.userName,
				}),
			});
			const result = bigBangLaunchResponseSchema.safeParse(
				await request("games/launch", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						game_id: Number(input.gameId),
						user_token: input.userId,
						language: input.language ?? "en",
					}),
				}),
			);
			if (!result.success) throw new Error("BigBang did not return a game URL");
			return { url: assertLaunchUrl(result.data.game_url) };
		},
		async listSandboxGames(limit = 9): Promise<BigBangSandboxGame[]> {
			const result = bigBangGamesResponseSchema.safeParse(
				await request(`games?type=standard&limit=${limit}`),
			);
			if (!result.success)
				throw new Error("BigBang returned an invalid game catalogue");
			return result.data.data;
		},

		async launchDemoGame(gameId: number): Promise<BigBangSandboxLaunch> {
			const result = bigBangLaunchResponseSchema.safeParse(
				await request("games/launch", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ game_id: gameId, demo: true, language: "en" }),
				}),
			);
			if (!result.success)
				throw new Error("BigBang did not return a demo game URL");

			return {
				gameId: result.data.game_id,
				gameName: result.data.game_name,
				url: assertLaunchUrl(result.data.game_url),
			};
		},
	};
}

function assertLaunchUrl(value: string) {
	const url = new URL(value);
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error("BigBang returned an unsupported game URL");
	}
	return url.href;
}
