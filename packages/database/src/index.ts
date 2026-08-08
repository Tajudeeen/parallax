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
