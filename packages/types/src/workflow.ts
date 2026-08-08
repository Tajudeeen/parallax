/**
 * Agent workflow contracts.
 *
 * A workflow is a named, ordered sequence of engine steps. Each step calls
 * an engine through the existing Orchestrator.route() path (same DataHub
 * context, budget, and memory-write machinery as a single task), so engines
 * stay pure and independently replaceable — the workflow just decides which
 * engine runs next and what to feed it. This is the "coordinate engines"
 * responsibility the Orchestrator has always claimed but never implemented.
 */

import type { EngineName } from "./engine.js";
import type { OrchestratorTask } from "./orchestrator.js";

export interface WorkflowStep {
  /** The engine this step invokes. */
  engine: EngineName;
  /** Free-form label for logs and task output. */
  name?: string;
  /**
   * Builds this step's input from the original workflow input plus the
   * outputs of every prior step. Returning undefined means "skip this step"
   * (e.g. a guard that short-circuits the workflow).
   */
  input: (ctx: WorkflowBuildContext) => unknown | undefined;
  /**
   * Optional per-step token budget, forwarded to DataHubQuery.tokenBudget.
   * Lets a chatty intermediate step stay small while a final step gets room.
   */
  tokenBudget?: number;
}

export interface WorkflowBuildContext {
  /** The input the whole workflow was started with. */
  input: unknown;
  /** Outputs of completed steps, keyed by step index. */
  stepOutputs: unknown[];
  /** Convenience: the most recent step's output. */
  lastOutput: unknown;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStepResult {
  index: number;
  name: string;
  engine: EngineName;
  task: OrchestratorTask;
  /** True when the step was skipped by its input builder returning undefined. */
  skipped: boolean;
}

export interface WorkflowRun {
  id: string;
  name: string;
  status: "completed" | "failed";
  steps: WorkflowStepResult[];
  /** Final engine output (the last non-skipped step's result.output). */
  output?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
}
