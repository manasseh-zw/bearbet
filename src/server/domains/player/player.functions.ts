import { createServerFn } from "@tanstack/react-start";

import { registerPlayerInputSchema } from "#/lib/types/auth";

import { registerPlayer } from "./player.registration";

export const registerPlayerFn = createServerFn({ method: "POST" })
	.validator(registerPlayerInputSchema)
	.handler(async ({ data }) => registerPlayer(data));
