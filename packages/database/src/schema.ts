import { pgTable, text, timestamp, jsonb, primaryKey, boolean, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryEntries = pgTable(
  "memory_entries",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.scope, table.key] }),
  }),
);

export const ingestionRecords = pgTable("ingestion_records", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  raw: jsonb("raw").notNull(),
});

export const processedRecords = pgTable("processed_records", {
  id: text("id").primaryKey(),
  ingestionId: text("ingestion_id")
    .notNull()
    .references(() => ingestionRecords.id),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull(),
});

export const aiUsageRecords = pgTable("ai_usage_records", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  success: boolean("success").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});