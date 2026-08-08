/**
 * Engine contracts.
 *
 * Every engine (Atlas, Prism, Sentinel, Echo, and any engine added later)
 * implements BaseEngine and nothing else is required of it. The Orchestrator
 * only ever talks to engines through this interface, so a new engine can be
 * dropped in without touching the Orchestrator or any other engine.
 */

import type { DataHubContext, MemoryWrite } from "./datahub.js";

export type EngineName = "atlas" | "prism" | "sentinel" | "echo" | (string & {});

export type EngineStatus =
  | "uninitialized"
  | "initializing"
  | "ready"
  | "processing"
  | "error"
  | "shutdown";

/**
 * Context handed to an engine when it's asked to do work. dataHub is a
 * narrowed read/write handle, not the whole DataHub package, so an engine
 * can't reach into DataHub internals it has no business touching.
 */
export interface EngineContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  input: unknown;
  metadata?: Record<string, unknown>;
  /** Populated by the Orchestrator before execute(), never set by the engine itself. */
  dataHubContext?: DataHubContext;
}

export interface EngineResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  /** Declared by the engine, executed by the Orchestrator against DataHub. */
  memoryWrites?: MemoryWrite[];
}

export interface EngineValidationResult {
  valid: boolean;
  reasons?: string[];
}

export interface EngineDescriptor {
  name: EngineName;
  version: string;
  description: string;
}

export interface BaseEngine {
  readonly descriptor: EngineDescriptor;
  readonly status: EngineStatus;

  /** One-time setup: load config, warm caches, verify dependencies are reachable. */
  initialize(): Promise<void>;

  /** Cheap pre-check that a given context is something this engine can handle. */
  validate(context: EngineContext): Promise<EngineValidationResult>;

  /** Do the actual work and return a result. Assumes validate() already passed. */
  process(context: EngineContext): Promise<EngineResult>;

  /** Alias entry point used by the Orchestrator's task-routing path. */
  execute(context: EngineContext): Promise<EngineResult>;

  /** Release resources, close connections, flush any pending state. */
  shutdown(): Promise<void>;
}
