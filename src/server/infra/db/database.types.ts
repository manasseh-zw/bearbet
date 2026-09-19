import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";

import type * as schema from "./schema";

export type DatabaseTransaction = NodePgTransaction<
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;
