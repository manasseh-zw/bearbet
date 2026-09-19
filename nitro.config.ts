import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
	vercel: {
		// TanStack Start server functions are exposed through this generated RPC
		// namespace. Give catalogue/provider-backed actions enough headroom for the
		// BigBang adapter's 20-second upstream request timeout plus DB work.
		functionRules: {
			"/_serverFn/**": {
				maxDuration: 45,
			},
		},
	},
});
