import type { DataHubQuery, ProcessedRecord, RetrievedChunk } from "@parallax/types";
import type { EmbeddingProvider } from "../embeddings/index.js";

export interface RetrievalService {
  index(record: ProcessedRecord): Promise<void>;
  retrieve(query: DataHubQuery): Promise<RetrievedChunk[]>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * In-memory vector index. Fine for Milestone 1 and for tests; Milestone 2
 * or 5 swaps the storage for a real vector database once we've picked one,
 * behind this same index()/retrieve() contract.
 */
class InMemoryRetrievalService implements RetrievalService {
  private store: Array<{ record: ProcessedRecord; vector: number[] }> = [];

  constructor(private embeddings: EmbeddingProvider) {}

  async index(record: ProcessedRecord): Promise<void> {
    const [vector] = await this.embeddings.embed([record.content]);
    this.store.push({ record, vector });
  }

  async retrieve(query: DataHubQuery): Promise<RetrievedChunk[]> {
    const [queryVector] = await this.embeddings.embed([query.query]);
    const topK = query.topK ?? 5;

    return this.store
      .map(({ record, vector }) => ({
        id: record.id,
        content: record.content,
        score: cosineSimilarity(queryVector, vector),
        source: String(record.metadata.source ?? "unknown"),
        metadata: record.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

export function createRetrievalService(embeddings: EmbeddingProvider): RetrievalService {
  return new InMemoryRetrievalService(embeddings);
}
