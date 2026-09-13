import { createServerFn } from "@tanstack/react-start";

import { getCurrentSession } from "./session";

export const getRouteSession = createServerFn({ method: "GET" }).handler(() =>
	getCurrentSession(),
);
