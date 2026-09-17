import { createFileRoute } from "@tanstack/react-router";

import { BigBangSandboxPage } from "#/components/casino/bigbang-sandbox-page";

export const Route = createFileRoute("/_app/bigbang-sandbox")({
	head: () => ({ meta: [{ title: "BigBang sandbox | BearBet" }] }),
	component: BigBangSandboxPage,
});
