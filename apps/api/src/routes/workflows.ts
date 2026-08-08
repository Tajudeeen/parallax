import { Router } from "express";
import type { Orchestrator } from "@parallax/orchestrator";
import { getWorkflow, listWorkflows } from "@parallax/orchestrator";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

/**
 * Workflow endpoints. A workflow is a named, ordered composition of engines
 * (see @parallax/orchestrator's WorkflowRunner). The Orchestrator executes
 * it through the same route() path as a single task, so auth, memory
 * writes, and context budgeting all apply unchanged.
 */
export function createWorkflowsRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  router.get("/workflows", (_req, res) => {
    res.json(listWorkflows().map((w) => ({ name: w.name, description: w.description, steps: w.steps.map((s) => s.engine) })));
  });

  router.post("/workflows/:name/run", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const name = String(req.params.name);
      const definition = getWorkflow(name);
      if (!definition) {
        res.status(404).json({ error: `Unknown workflow: ${name}` });
        return;
      }
      const run = await orchestrator.runWorkflow(definition, req.body, { userId: req.userId });
      res.status(202).json(run);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
