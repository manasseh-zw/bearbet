import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { BonusCelebrationProvider } from "./components/shared/bonus-celebration-provider";
import { LocalStorageProvider } from "./components/shared/local-storage-provider";
import { ToastProvider } from "./components/shared/toast-provider";
import { TooltipProvider } from "./components/ui/tooltip";

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
			<LocalStorageProvider>
				<TooltipProvider>{children}</TooltipProvider>
			</LocalStorageProvider>
			<ToastProvider />
			<BonusCelebrationProvider />
		</QueryClientProvider>
	);
}
