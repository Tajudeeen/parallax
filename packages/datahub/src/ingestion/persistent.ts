import { schema, getDb } from "@parallax/database";
import type { IngestionRecord } from "@parallax/types";
import type { IngestionService, IngestionSource } from "./index.js";

export class PersistentIngestionService implements IngestionService {
  private sources = new Map<string, IngestionSource>();

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

    await getDb().insert(schema.ingestionRecords).values({
      id: record.id,
      source: record.source,
      receivedAt: new Date(record.receivedAt),
      raw: record.raw as object,
    });

    return record;
  }
}

export function createPersistentIngestionService(): IngestionService {
  return new PersistentIngestionService();
}
