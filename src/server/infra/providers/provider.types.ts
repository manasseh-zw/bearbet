export type CasinoMode = "fun" | "real";

export type NormalizedGame = {
	id: string;
	code?: string;
	name: string;
	provider: string;
	category?: string;
	type?: string;
	description?: string;
	rtp?: number;
	bannerUrl?: string;
	coverUrl?: string;
	supportsFun: boolean;
	isAvailable: boolean;
	isMobile: boolean;
	hasFreeSpins: boolean;
	hasLobby: boolean;
	hasTables: boolean;
};

export type NormalizedCatalogue = {
	games: NormalizedGame[];
};

export type LaunchGameInput = {
	gameId: string;
	userId: string;
	userName: string;
	currencyCode: string;
	language?: string;
};

export type LaunchGameResult = {
	url: string;
	externalSessionId?: string;
	providerPlayerId?: string;
	providerBalanceMinor?: number;
	providerCurrencyCode?: string;
};

export type ProviderBalance = {
	playerId: string;
	balanceMinor: number;
	currencyCode: string;
};

export type CasinoProvider = {
	syncCatalogue: () => Promise<NormalizedCatalogue>;
	launchGame: (input: LaunchGameInput) => Promise<LaunchGameResult>;
	getPlayerBalance?: (playerId: string) => Promise<ProviderBalance>;
};

type CallbackIdentity = {
	userId: string;
	isDashboardProbe: boolean;
};

type CallbackOperation = CallbackIdentity & {
	transactionId: string;
	sessionId: string;
	roundId: string;
	gameId: string;
};

export type NormalizedProviderCallback =
	| (CallbackIdentity & { kind: "accountDetails" })
	| (CallbackIdentity & { kind: "balance" })
	| (CallbackOperation & { kind: "bet"; amountMinor: number })
	| (CallbackOperation & {
			kind: "win";
			betAmountMinor: number;
			winAmountMinor: number;
	  })
	| (CallbackOperation & { kind: "refund"; amountMinor: number });
