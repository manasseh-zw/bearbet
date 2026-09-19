import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	// Discover Base UI's deep imports in one pass so later component imports do not
	// invalidate shared optimizer chunks while the browser is loading the app.
	optimizeDeps: {
		include: ["@base-ui/react/**/*.mjs"],
	},
	// The sandbox callback receiver is tested through ephemeral ngrok hosts.
	server: { allowedHosts: [".ngrok-free.app"] },
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
