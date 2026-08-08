/**
 * DataHub contracts.
 *
 * Any engine, or the Orchestrator on an engine's behalf, requests context
 * from DataHub through this shape. DataHub decides internally whether that
 * means a vector search, a knowledge graph lookup, a memory read, or some
 * mix of all three; the caller doesn't need to know which.
 */

export type MemoryScope = "user" | "project" | "system";

export interface DataHubQuery {
  query: string;
  scope?: MemoryScope;
  topK?: number;
  filters?: Record<string, unknown>;
  /** Optional token budget. When set, the Orchestrator fits the retrieved
   * context (chunks + memory) into this budget before handing it to the
   * engine, highest-scoring chunks first. Defaults to no limit. */
  tokenBudget?: number;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface DataHubContext {
  chunks: RetrievedChunk[];
  memory?: Record<string, unknown>;
  knowledge?: Record<string, unknown>;
}

/**
 * An engine's declared intent to persist something to DataHub memory.
 * Engines never write to DataHub directly; they return this from
 * processing, and the Orchestrator performs the actual write. Keeps
 * engines as pure functions of (input, context) -> result.
 */
export interface MemoryWrite {
  scope: MemoryScope;
  key: string;
  value: unknown;
}

export interface IngestionRecord {
  id: string;
  source: string;
  receivedAt: string;
  raw: unknown;
}

export interface ProcessedRecord {
  id: string;
  ingestionId: string;
  content: string;
  metadata: Record<string, unknown>;
}
