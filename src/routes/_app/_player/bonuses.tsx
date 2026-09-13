import { createFileRoute } from "@tanstack/react-router";

import { BonusesPage } from "#/components/player/bonus/bonuses-page";

export const Route = createFileRoute("/_app/_player/bonuses")({
	head: () => ({ meta: [{ title: "Bonuses | BearBet" }] }),
	component: BonusesPage,
});
