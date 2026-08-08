import type { DataHubContext, DataHubQuery, IngestionRecord } from "@parallax/types";
import { createLogger } from "@parallax/shared";

import { createIngestionService, type IngestionService } from "./ingestion/index.js";
import { createPersistentIngestionService } from "./ingestion/persistent.js";
import { ConnectorRegistry } from "./connectors/index.js";
import { createProcessingService, type ProcessingService } from "./processing/index.js";
import { createPersistentProcessingService } from "./processing/persistent.js";
import { createEmbeddingProvider } from "./embeddings/index.js";
import { createRetrievalService, type RetrievalService } from "./retrieval/index.js";
import { createMemoryService, type MemoryService } from "./memory/index.js";
import { createPersistentMemoryService } from "./memory/persistent.js";
import { createKnowledgeService, type KnowledgeService } from "./knowledge/index.js";

export * from "./ingestion/index.js";
export * from "./ingestion/persistent.js";
export * from "./connectors/index.js";
export * from "./processing/index.js";
export * from "./processing/persistent.js";
export * from "./embeddings/index.js";
export * from "./retrieval/index.js";
export * from "./memory/index.js";
export * from "./memory/persistent.js";
export * from "./knowledge/index.js";

const logger = createLogger("datahub");

export interface DataHubOptions {
  /**
   * When true, ingestion/processing/memory are backed by real Postgres
   * (via @parallax/database). Retrieval and knowledge stay in-memory
   * regardless, since we haven't committed to a vector store or graph
   * store yet (see Milestone 2 notes). Defaults to false so unit tests
   * stay fast and don't need a live database.
   */
  persistent?: boolean;
}

/**
 * DataHub is the single object every engine and the Orchestrator talk to.
 * Nothing outside this file needs to know that "context" is assembled from
 * seven different subsystems; getContext() is the entire public surface
 * that matters for intelligence workflows.
 */
export class DataHub {
  readonly ingestion: IngestionService;
  readonly connectors: ConnectorRegistry = new ConnectorRegistry();
  readonly processing: ProcessingService;
  readonly retrieval: RetrievalService = createRetrievalService(createEmbeddingProvider());
  readonly memory: MemoryService;
  readonly knowledge: KnowledgeService = createKnowledgeService();

  constructor(options: DataHubOptions = {}) {
    this.ingestion = options.persistent ? createPersistentIngestionService() : createIngestionService();
    this.processing = options.persistent ? createPersistentProcessingService() : createProcessingService();
    this.memory = options.persistent ? createPersistentMemoryService() : createMemoryService();
  }

  /** Ingest a raw record from some source, process it, and index it for retrieval. */
  async ingestAndIndex(source: string, raw: unknown): Promise<void> {
    const record: IngestionRecord = await this.ingestion.ingest(source, raw);
    const processed = await this.processing.process(record);
    await this.retrieval.index(processed);
    logger.debug("ingested and indexed record", { source, recordId: record.id });
  }

  /**
   * The one method every engine calls. Returns retrieved chunks plus
   * whatever memory scope was asked for. Engines never call retrieval,
   * memory, or knowledge directly; they go through here.
   */
  async getContext(query: DataHubQuery): Promise<DataHubContext> {
    const chunks = await this.retrieval.retrieve(query);
    const memory = query.scope ? await this.memory.all(query.scope) : undefined;

    return { chunks, memory };
  }
}

export function createDataHub(options?: DataHubOptions): DataHub {
  return new DataHub(options);
}
