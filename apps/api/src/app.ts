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
import { requestContext, accessLog } from "./middleware/access-log.js";
import { aiRateLimiter } from "./middleware/rate-limit.js";

export function buildApp(orchestrator: Orchestrator): Express {
  const app = express();

  const webOrigin = getConfig().webOrigin;
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json());

  // Correlation id + one structured access log line per request.
  app.use(requestContext);
  app.use(accessLog);

  app.use(healthRouter);
  app.use(authRouter);
  app.use(createTasksRouter(orchestrator));
  // The AI layer calls paid external providers: rate-limit it.
  app.use("/ai", aiRateLimiter, createAiRouter());
  app.use("/workflows", aiRateLimiter, createWorkflowsRouter(orchestrator));

  // Must be registered last: Express only treats a 4-arg handler as an
  // error handler when it's added after every other middleware and route.
  app.use(errorHandler);

  return app;
}
