import "@tanstack/react-start/server-only";

import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

import { auth } from "./auth";

type GetSessionOptions = {
	disableCookieCache?: boolean;
	disableRefresh?: boolean;
};

export const getCurrentSession = createServerOnlyFn(
	async (options?: GetSessionOptions) => {
		const result = await auth.api.getSession({
			headers: getRequest().headers,
			query: options,
			returnHeaders: true,
		});

		const cookies = result.headers?.getSetCookie();
		if (cookies?.length) {
			setResponseHeader("Set-Cookie", cookies);
		}

		return result.response ?? null;
	},
);
