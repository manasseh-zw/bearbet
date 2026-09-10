import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

export type AppContext = {
	queryClient: QueryClient;
};

export function createAppContext(): AppContext {
	return {
		queryClient: new QueryClient(),
	};
}

type AppProviderProps = PropsWithChildren<{
	context: AppContext;
}>;

export function AppProvider({ children, context }: AppProviderProps) {
	return (
		<QueryClientProvider client={context.queryClient}>
			{children}
		</QueryClientProvider>
	);
}
