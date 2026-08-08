import { Router } from "express";
import { getDb } from "@parallax/database";
import { createLogger } from "@parallax/shared";

const logger = createLogger("health");

export const healthRouter = Router();

// Liveness: is the process up? Does not touch dependencies, so a crashing
// dependency must not flip this to 500 (otherwise the process gets killed
// by the orchestrator for being "down" when it's actually just degraded).
healthRouter.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness: can this instance serve traffic *right now*? Probes Postgres.
// A load balancer should only route here when this returns 200.
healthRouter.get("/readyz", async (_req, res) => {
  try {
    await getDb().execute("select 1");
    res.json({ status: "ready", timestamp: new Date().toISOString() });
  } catch (err) {
    logger.warn("readiness check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      reason: "database unreachable",
    });
  }
});
