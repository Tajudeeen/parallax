import "dotenv/config";
import { createDatabaseClient } from "@parallax/database";
import { createDataHub } from "@parallax/datahub";
import { EngineRegistry, createOrchestrator } from "@parallax/orchestrator";
import { AtlasEngine } from "@parallax/engine-atlas";
import { PrismEngine } from "@parallax/engine-prism";
import { SentinelEngine } from "@parallax/engine-sentinel";
import { EchoEngine } from "@parallax/engine-echo";
import { getConfig, validateConfigForEnv } from "@parallax/config";
import { createLogger } from "@parallax/shared";
import { buildApp } from "./app.js";

const logger = createLogger("api");

async function main() {
  const config = getConfig();

  // Fail fast with a clear message instead of a cryptic connect-time crash.
  const problems = validateConfigForEnv(config);
  if (problems.length) {
    for (const p of problems) logger.error("config problem", { detail: p });
    throw new Error(`Refusing to start: ${problems.length} config problem(s) — see logs above.`);
  }

  const dbClient = createDatabaseClient();
  await dbClient.connect();
  // Create tables if missing so a fresh Postgres actually boots the app.
  await dbClient.ensureSchema();

  const dataHub = createDataHub({ persistent: true });
  const registry = new EngineRegistry();

  registry.register(new AtlasEngine());
  registry.register(new PrismEngine());
  registry.register(new SentinelEngine());
  registry.register(new EchoEngine());

  const orchestrator = createOrchestrator(registry, dataHub);
  await orchestrator.initialize();

  const app = buildApp(orchestrator);

  const server = app.listen(config.port, () => {
    logger.info("parallax api listening", {
      port: config.port,
      env: config.nodeEnv,
      engines: registry.list(),
    });
  });

  // Track in-flight requests so we can drain them before exiting.
  let inflight = 0;
  server.on("request", (_req, res) => {
    inflight++;
    res.on("finish", () => { inflight--; });
    res.on("close", () => { inflight--; });
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("shutdown signal received", { signal });

    // Stop accepting new connections; existing ones finish naturally.
    server.close(() => logger.info("http server closed"));

    // Give in-flight requests a bounded window to complete.
    const deadline = Date.now() + 10_000;
    while (inflight > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (inflight > 0) logger.warn("forcing shutdown with requests still in flight", { inflight });

    await orchestrator.shutdown();
    await dbClient.disconnect();
    logger.info("shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("fatal error during startup", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
