import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Cloud-sync store: the full Signal Petal workspace, serialised as one JSON blob
// per user. Local-first data still lives in localStorage; this is the cross-device
// copy. See app/api/state/route.ts and app/lib/sync.ts.
export const stateTable = sqliteTable("app_state", {
  userId: text("user_id").primaryKey(),
  data: text("data").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
