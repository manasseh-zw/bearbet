import "@tanstack/react-start/server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "#/server/env";

import * as schema from "./schema";

export const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: env.NODE_ENV === "production" ? 5 : 10,
});

export const db = drizzle(pool, { schema });
