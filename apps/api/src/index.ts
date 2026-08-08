import "dotenv/config";
import { createDatabaseClient } from "@parallax/database";
import { createDataHub } from "@parallax/datahub";
import { EngineRegistry, createOrchestrator } from "@parallax/orchestrator";
import { AtlasEngine } from "@parallax/engine-atlas";
import { PrismEngine } from "@parallax/engine-prism";
import { SentinelEngine } from "@parallax/engine-sentinel";
import { EchoEngine } from "@parallax/engine-echo";
import { getConfig } from "@parallax/config";
import { createLogger } from "@parallax/shared";
import { buildApp } from "./app.js";

const logger = createLogger("api");

async function main() {
  const config = getConfig();

  const dbClient = createDatabaseClient();
  await dbClient.connect();

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

  const shutdown = async () => {
    logger.info("shutting down");
    server.close();
    await orchestrator.shutdown();
    await dbClient.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error("fatal error during startup", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
