import type {
  BaseEngine,
  EngineContext,
  EngineDescriptor,
  EngineResult,
  EngineStatus,
  EngineValidationResult,
  MemoryWrite,
} from "@parallax/types";
import { createLogger } from "./logger.js";

/**
 * Handles status transitions and logging so every engine doesn't reimplement
 * the same bookkeeping. Concrete engines only need to implement doProcess()
 * and, optionally, override validate().
 */
export abstract class AbstractBaseEngine implements BaseEngine {
  abstract readonly descriptor: EngineDescriptor;
  private _status: EngineStatus = "uninitialized";
  protected logger = createLogger(this.constructor.name);

  get status(): EngineStatus {
    return this._status;
  }

  async initialize(): Promise<void> {
    this._status = "initializing";
    await this.onInitialize();
    this._status = "ready";
  }

  async validate(context: EngineContext): Promise<EngineValidationResult> {
    return { valid: true };
  }

  async process(context: EngineContext): Promise<EngineResult> {
    const start = Date.now();
    this._status = "processing";
    try {
      const validation = await this.validate(context);
      if (!validation.valid) {
        this._status = "error";
        return { success: false, error: validation.reasons?.join(", ") ?? "validation failed" };
      }
      const output = await this.doProcess(context);
      const memoryWrites = await this.getMemoryWrites(context, output);
      this._status = "ready";
      return {
        success: true,
        output,
        memoryWrites: memoryWrites.length ? memoryWrites : undefined,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      this._status = "error";
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      };
    }
  }

  async execute(context: EngineContext): Promise<EngineResult> {
    return this.process(context);
  }

  async shutdown(): Promise<void> {
    await this.onShutdown();
    this._status = "shutdown";
  }

  /** Override for setup work: warming caches, checking dependencies. */
  protected async onInitialize(): Promise<void> {}

  /** Override for teardown work. */
  protected async onShutdown(): Promise<void> {}

  /** The engine's actual logic. Required. */
  protected abstract doProcess(context: EngineContext): Promise<unknown>;

  /**
   * Override to declare memory writes based on what was just processed.
   * Defaults to none. The Orchestrator, not the engine, performs the
   * actual write against DataHub.
   */
  protected async getMemoryWrites(context: EngineContext, output: unknown): Promise<MemoryWrite[]> {
    return [];
  }
}
