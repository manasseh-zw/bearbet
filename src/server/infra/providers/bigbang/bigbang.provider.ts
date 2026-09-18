import "@tanstack/react-start/server-only";

import { z } from "zod";
import type {
	LaunchGameInput,
	NormalizedGame,
	ProviderBalance,
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
	session_id: z.string().min(1).optional(),
});

const bigBangBalanceResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		user_token: z.string().min(1),
		balance: z.union([z.string(), z.number()]),
		currency: z.string().length(3),
	}),
});

export type BigBangConfig = {
	baseUrl: string;
	sandboxKey: string;
	reconcileSandbox?: boolean;
};

export type BigBangSandboxGame = z.infer<typeof bigBangGameSchema>;

export type BigBangSandboxLaunch = {
	gameId: number;
	gameName: string;
	playerId?: string;
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
				...(game.category_title || game.category
					? { category: game.category_title ?? game.category }
					: {}),
				type: normalizeBigBangGameType(game.game_type),
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
			const balance = await getPlayerBalance(input.userId);
			if (balance.currencyCode !== input.currencyCode) {
				throw new Error(
					`BigBang player currency ${balance.currencyCode} does not match ${input.currencyCode}`,
				);
			}
			return {
				url: assertLaunchUrl(result.data.game_url),
				externalSessionId: result.data.session_id,
				providerPlayerId: input.userId,
				providerBalanceMinor: balance.balanceMinor,
				providerCurrencyCode: balance.currencyCode,
			};
		},
		getPlayerBalance,
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

		async launchSandboxGame(
			gameId: number,
			playerId: string,
		): Promise<BigBangSandboxLaunch> {
			if (!config.sandboxKey.startsWith("ek_test_")) {
				throw new Error(
					"Callback capture is available only with a sandbox key",
				);
			}

			await request("users/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ user_token: playerId, username: playerId }),
			});
			const result = bigBangLaunchResponseSchema.safeParse(
				await request("games/launch", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						game_id: gameId,
						user_token: playerId,
						language: "en",
					}),
				}),
			);
			if (!result.success)
				throw new Error("BigBang did not return a sandbox game URL");

			return {
				gameId: result.data.game_id,
				gameName: result.data.game_name,
				playerId,
				url: assertLaunchUrl(result.data.game_url),
			};
		},
	};

	async function getPlayerBalance(playerId: string): Promise<ProviderBalance> {
		const result = bigBangBalanceResponseSchema.safeParse(
			await request(`balance/${encodeURIComponent(playerId)}`),
		);
		if (!result.success) {
			throw new Error("BigBang did not return a valid player balance");
		}

		return {
			playerId: result.data.data.user_token,
			balanceMinor: decimalToMinorUnits(result.data.data.balance),
			currencyCode: result.data.data.currency.toUpperCase(),
		};
	}
}

function assertLaunchUrl(value: string) {
	const url = new URL(value);
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error("BigBang returned an unsupported game URL");
	}
	return url.href;
}

function normalizeBigBangGameType(type: BigBangSandboxGame["game_type"]) {
	if (type === "slot") return "slots";
	if (type === "crash") return "crashgame";
	return "live";
}

function decimalToMinorUnits(value: string | number) {
	const text = String(value);
	const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
	if (!match) throw new Error("BigBang returned an invalid player balance");

	const minor =
		BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
	if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new Error("BigBang returned a player balance that is too large");
	}
	return Number(minor);
}
