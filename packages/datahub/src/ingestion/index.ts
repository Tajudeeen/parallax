import type { IngestionRecord } from "@parallax/types";

/**
 * A source is anything that can hand DataHub raw data: a file upload, an
 * API webhook, a future connector. Milestone 1 defines the contract only;
 * concrete sources arrive in Milestone 2 alongside real connectors.
 */
export interface IngestionSource {
  name: string;
  fetch(): Promise<unknown[]>;
}

export interface IngestionService {
  registerSource(source: IngestionSource): void;
  ingest(source: string, raw: unknown): Promise<IngestionRecord>;
}

class InMemoryIngestionService implements IngestionService {
  private sources = new Map<string, IngestionSource>();
  private records: IngestionRecord[] = [];

  registerSource(source: IngestionSource): void {
    this.sources.set(source.name, source);
  }

  async ingest(source: string, raw: unknown): Promise<IngestionRecord> {
    const record: IngestionRecord = {
      id: crypto.randomUUID(),
      source,
      receivedAt: new Date().toISOString(),
      raw,
    };
    this.records.push(record);
    return record;
  }
}

export function createIngestionService(): IngestionService {
  return new InMemoryIngestionService();
}
