import "dotenv/config";
import path from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createLogger } from "@parallax/shared";

const logger = createLogger("migrate");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  logger.info("running migrations");
  await migrate(db, { migrationsFolder: path.join(__dirname, "../migrations") });
  logger.info("migrations complete");

  await pool.end();
}

main().catch((err) => {
  logger.error("migration failed", { error: String(err) });
  process.exit(1);
});
