import { Router } from "express";
import type { Orchestrator } from "@parallax/orchestrator";
import type { EngineName } from "@parallax/types";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

/**
 * Factory instead of a module-level singleton, so the router is built with
 * whichever Orchestrator instance the app composed at startup. Keeps this
 * testable without needing to fake global state.
 */
export function createTasksRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  router.post("/engines/:name/run", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const engine = req.params.name as EngineName;
      const task = await orchestrator.route(engine, {
        requestId: crypto.randomUUID(),
        userId: req.userId,
        input: req.body,
      });
      res.status(202).json(task);
    } catch (err) {
      next(err);
    }
  });

  router.get("/tasks/:id", requireAuth, (req: AuthenticatedRequest, res) => {
    const task = orchestrator.getTask(req.params.id as string);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  });

  return router;
}
