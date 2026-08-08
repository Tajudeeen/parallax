import type { EngineContext, EngineName, EngineResult } from "./engine.js";

export type TaskStatus = "queued" | "running" | "completed" | "failed";

export interface OrchestratorTask {
  id: string;
  engine: EngineName;
  context: EngineContext;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  result?: EngineResult;
}
