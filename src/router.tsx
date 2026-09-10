import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { AppProvider, createAppContext } from "./provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = createAppContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		Wrap: ({ children }) => (
			<AppProvider context={context}>{children}</AppProvider>
		),
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient: context.queryClient,
		wrapQueryClient: false,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
