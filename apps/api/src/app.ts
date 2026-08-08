import express, { type Express } from "express";
import cors from "cors";
import type { Orchestrator } from "@parallax/orchestrator";
import { getConfig } from "@parallax/config";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { createTasksRouter } from "./routes/tasks.js";
import { createAiRouter } from "./routes/ai.js";
import { createWorkflowsRouter } from "./routes/workflows.js";
import { errorHandler } from "./middleware/error-handler.js";

export function buildApp(orchestrator: Orchestrator): Express {
  const app = express();

  const webOrigin = getConfig().webOrigin;
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(authRouter);
  app.use(createTasksRouter(orchestrator));
  app.use(createAiRouter());
  app.use(createWorkflowsRouter(orchestrator));

  // Must be registered last: Express only treats a 4-arg handler as an
  // error handler when it's added after every other middleware and route.
  app.use(errorHandler);

  return app;
}
