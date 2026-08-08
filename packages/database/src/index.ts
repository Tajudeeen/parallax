import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { getConfig } from "@parallax/config";
import { createLogger } from "@parallax/shared";
import * as schema from "./schema.js";

const logger = createLogger("database");

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let db: Database | null = null;

export interface DatabaseClient {
  connect(): Promise<void>;
  /** Idempotently create all tables if missing. Safe to call on every boot. */
  ensureSchema(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

class PgDatabaseClient implements DatabaseClient {
  private connected = false;

  async connect(): Promise<void> {
    const { databaseUrl } = getConfig();
    pool = new Pool({ connectionString: databaseUrl });
    // Fail fast on a bad connection string instead of only discovering it
    // on the first real query, which is a confusing place to debug this.
    await pool.query("select 1");
    db = drizzle(pool, { schema });
    this.connected = true;
    logger.info("connected to postgres");
  }

  async ensureSchema(): Promise<void> {
    if (!pool) throw new Error("Database not connected. Call connect() before ensureSchema().");
    // Idempotent: the app can call this on every boot without erroring on
    // an already-initialised database. This removes the "forgot to run
    // migrations" class of production startup failure.
    const statements = [
      `CREATE TABLE IF NOT EXISTS "ingestion_records" (
        "id" text PRIMARY KEY NOT NULL,
        "source" text NOT NULL,
        "received_at" timestamp with time zone DEFAULT now() NOT NULL,
        "raw" jsonb NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "memory_entries" (
        "scope" text NOT NULL,
        "key" text NOT NULL,
        "value" jsonb NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "memory_entries_scope_key_pk" PRIMARY KEY("scope","key")
      )`,
      `CREATE TABLE IF NOT EXISTS "processed_records" (
        "id" text PRIMARY KEY NOT NULL,
        "ingestion_id" text NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY NOT NULL,
        "email" text NOT NULL,
        "password_hash" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "users_email_unique" UNIQUE("email")
      )`,
      `CREATE TABLE IF NOT EXISTS "ai_usage_records" (
        "id" text PRIMARY KEY NOT NULL,
        "provider" text NOT NULL,
        "model" text NOT NULL,
        "success" boolean DEFAULT false NOT NULL,
        "input_tokens" integer DEFAULT 0 NOT NULL,
        "output_tokens" integer DEFAULT 0 NOT NULL,
        "latency_ms" integer DEFAULT 0 NOT NULL,
        "error_message" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )`,
    ];
    for (const sql of statements) {
      await pool.query(sql);
    }
    logger.info("schema ensured");
  }

  async disconnect(): Promise<void> {
    if (pool) {
      await pool.end();
    }
    pool = null;
    db = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export function createDatabaseClient(): DatabaseClient {
  return new PgDatabaseClient();
}

/** Only valid after a DatabaseClient has connect()'d. Throws otherwise, on purpose. */
export function getDb(): Database {
  if (!db) {
    throw new Error("Database not connected. Call DatabaseClient.connect() first.");
  }
  return db;
}

export * as schema from "./schema.js";
export * from "./users-repository.js";
