import { schema, getDb } from "@parallax/database";
import type { IngestionRecord, ProcessedRecord } from "@parallax/types";
import type { ProcessingService } from "./index.js";

export class PersistentProcessingService implements ProcessingService {
  async process(record: IngestionRecord): Promise<ProcessedRecord> {
    const content =
      typeof record.raw === "string" ? record.raw : JSON.stringify(record.raw);

    const processed: ProcessedRecord = {
      id: crypto.randomUUID(),
      ingestionId: record.id,
      content,
      metadata: {
        source: record.source,
        receivedAt: record.receivedAt,
        length: content.length,
      },
    };

    await getDb().insert(schema.processedRecords).values({
      id: processed.id,
      ingestionId: processed.ingestionId,
      content: processed.content,
      metadata: processed.metadata,
    });

    return processed;
  }
}

export function createPersistentProcessingService(): ProcessingService {
  return new PersistentProcessingService();
}
