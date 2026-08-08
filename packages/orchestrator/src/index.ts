import type {
  DataHubContext,
  DataHubQuery,
  EngineContext,
  EngineName,
  OrchestratorTask,
  WorkflowDefinition,
  WorkflowRun,
} from "@parallax/types";
import type { DataHub } from "@parallax/datahub";
import { optimizeContext } from "@parallax/ai";
import { createLogger } from "@parallax/shared";
import { EngineRegistry } from "./engine-registry.js";
import { WorkflowRunner } from "./workflows/index.js";

export * from "./engine-registry.js";
export * from "./workflows/index.js";
export * from "./workflows/definitions.js";

const logger = createLogger("orchestrator");

/**
 * The Orchestrator is the only thing that talks to both DataHub and the
 * engines. Engines never call each other directly and never call DataHub
 * directly; every cross-cutting call goes through here, which is what
 * keeps engines independently replaceable.
 */
export class Orchestrator {
  private tasks = new Map<string, OrchestratorTask>();
  private readonly workflowRunner: WorkflowRunner;

  constructor(
    private readonly registry: EngineRegistry,
    private readonly dataHub: DataHub,
  ) {
    // The runner drives control flow through this Orchestrator's own route(),
    // so workflows inherit the exact same DataHub context, budget, and
    // memory-write behavior as a single engine task.
    this.workflowRunner = new WorkflowRunner((engine, context) => this.route(engine, context));
  }

  async initialize(): Promise<void> {
    await this.registry.initializeAll();
    logger.info("orchestrator initialized", { engines: this.registry.list() });
  }

  /** Fetch context from DataHub on behalf of whichever engine needs it. */
  async requestContext(query: DataHubQuery) {
    return this.dataHub.getContext(query);
  }

  /** Route a task to a named engine, tracking its execution state throughout. */
  async route(engine: EngineName, context: EngineContext): Promise<OrchestratorTask> {
    // Look up the engine first, outside the try/catch below. An unknown
    // engine name is a client error (404), not a failed task, so it should
    // propagate to the caller rather than get recorded as task history.
    const target = this.registry.get(engine);

    const task: OrchestratorTask = {
      id: context.requestId,
      engine,
      context,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);

    task.status = "running";
    try {
      // Fetch DataHub context before execution. This is the actual
      // implementation of "every engine must be able to request context
      // from DataHub": the engine never calls DataHub itself, the
      // Orchestrator does it on the engine's behalf and hands the result
      // in as part of the context.
      const query: DataHubQuery = {
        query: JSON.stringify(context.input).slice(0, 500),
        scope: context.userId ? "user" : "system",
        // No artificial topK cap: the budget (if any) is what trims context,
        // and optimizeContext keeps the highest-scoring chunks when it does.
        topK: context.metadata?.topK as number | undefined ?? 20,
        tokenBudget: context.metadata?.tokenBudget as number | undefined,
      };
      const rawContext = await this.dataHub.getContext(query);

      // Fit the context to the requested token budget before the engine
      // sees it. With no budget this is a pass-through; with one it keeps
      // the highest-scoring chunks first and drops memory wholesale rather
      // than silently truncating it. This is where @parallax/ai's
      // context-optimizer actually earns its place in the request path.
      const optimized = query.tokenBudget
        ? optimizeContext(rawContext, query.tokenBudget)
        : null;
      const dataHubContext: DataHubContext = optimized
        ? { chunks: optimized.selectedChunks, memory: optimized.memory }
        : rawContext;

      const result = await target.execute({ ...context, dataHubContext });
      task.status = result.success ? "completed" : "failed";
      task.result = result;

      // Engines declare writes, the Orchestrator performs them. Keeps
      // engines as pure functions of (input, context) -> result.
      if (result.memoryWrites?.length) {
        for (const write of result.memoryWrites) {
          await this.dataHub.memory.set(write.scope, write.key, write.value);
        }
      }
    } catch (err) {
      task.status = "failed";
      task.result = { success: false, error: err instanceof Error ? err.message : String(err) };
    }
    task.completedAt = new Date().toISOString();

    logger.info("task routed", { taskId: task.id, engine, status: task.status });
    return task;
  }

  getTask(id: string): OrchestratorTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Run a named agent workflow: an ordered sequence of engine steps where
   * each step's output is threaded into the next. Control flow lives here,
   * not in the engines. See WorkflowRunner for failure semantics.
   */
  runWorkflow(
    definition: WorkflowDefinition,
    input: unknown,
    baseContext: { userId?: string; sessionId?: string } = {},
  ): Promise<WorkflowRun> {
    return this.workflowRunner.run(definition, input, baseContext);
  }

  async shutdown(): Promise<void> {
    await this.registry.shutdownAll();
  }
}

export function createOrchestrator(registry: EngineRegistry, dataHub: DataHub): Orchestrator {
  return new Orchestrator(registry, dataHub);
}
