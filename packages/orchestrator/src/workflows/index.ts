import { randomUUID } from "crypto";
import type {
  EngineContext,
  EngineName,
  OrchestratorTask,
  WorkflowBuildContext,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowStepResult,
} from "@parallax/types";
import { createLogger } from "@parallax/shared";

const logger = createLogger("workflow-runner");

/**
 * Executes an ordered sequence of engine steps, threading each step's output
 * into the next, all through the Orchestrator's normal route() path. This is
 * the concrete form of the Orchestrator's "coordinate engines" job: it owns
 * the control flow, not the engines. A step that throws (or whose engine
 * returns success:false) fails the whole run, which is the predictable
 * behavior for a dependent pipeline.
 */
export class WorkflowRunner {
  constructor(
    private readonly route: (engine: EngineName, context: EngineContext) => Promise<OrchestratorTask>,
  ) {}

  async run(
    definition: WorkflowDefinition,
    input: unknown,
    baseContext: { userId?: string; sessionId?: string } = {},
  ): Promise<WorkflowRun> {
    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    const steps: WorkflowStepResult[] = [];
    const stepOutputs: unknown[] = [];

    logger.info("workflow started", { runId, name: definition.name, stepCount: definition.steps.length });

    try {
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        const buildCtx: WorkflowBuildContext = {
          input,
          stepOutputs,
          lastOutput: stepOutputs.length ? stepOutputs[stepOutputs.length - 1] : undefined,
        };
        const stepInput = step.input(buildCtx);

        // A step builder returning undefined short-circuits that step without
        // failing the run — useful for conditional branches.
        if (stepInput === undefined) {
          logger.info("workflow step skipped", { runId, step: i, engine: step.engine });
          steps.push({
            index: i,
            name: step.name ?? step.engine,
            engine: step.engine,
            task: {} as OrchestratorTask,
            skipped: true,
          });
          continue;
        }

        const context: EngineContext = {
          requestId: `${runId}:${i}`,
          userId: baseContext.userId,
          sessionId: baseContext.sessionId ?? runId,
          input: stepInput,
          metadata: step.tokenBudget ? { tokenBudget: step.tokenBudget } : undefined,
        };

        const task = await this.route(step.engine, context);
        steps.push({
          index: i,
          name: step.name ?? step.engine,
          engine: step.engine,
          task,
          skipped: false,
        });

        if (!task.result?.success) {
          const reason = task.result?.error ?? "unknown engine failure";
          throw new Error(`workflow step ${i} (${step.name ?? step.engine}) failed: ${reason}`);
        }
        stepOutputs.push(task.result.output);
      }

      const finalOutput = stepOutputs.length ? stepOutputs[stepOutputs.length - 1] : undefined;
      const run: WorkflowRun = {
        id: runId,
        name: definition.name,
        status: "completed",
        steps,
        output: finalOutput,
        startedAt,
        completedAt: new Date().toISOString(),
      };
      logger.info("workflow completed", { runId, name: definition.name });
      return run;
    } catch (err) {
      const run: WorkflowRun = {
        id: runId,
        name: definition.name,
        status: "failed",
        steps,
        error: err instanceof Error ? err.message : String(err),
        startedAt,
        completedAt: new Date().toISOString(),
      };
      logger.error("workflow failed", { runId, name: definition.name, error: run.error });
      return run;
    }
  }
}
