import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const roomDirectory = sqliteTable("room_directory", {
  code: text("code").primaryKey(),
  backendUrl: text("backend_url").notNull(),
  expiresAt: integer("expires_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
