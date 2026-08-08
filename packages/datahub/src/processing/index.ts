import type { IngestionRecord, ProcessedRecord } from "@parallax/types";

export interface ProcessingService {
  process(record: IngestionRecord): Promise<ProcessedRecord>;
}

/**
 * Milestone 1 gives this a trivial, deterministic implementation: stringify
 * the raw payload and attach basic metadata. Real cleaning, normalization,
 * and metadata extraction rules land in Milestone 2 once we know the first
 * real data sources we're processing.
 */
class BasicProcessingService implements ProcessingService {
  async process(record: IngestionRecord): Promise<ProcessedRecord> {
    const content =
      typeof record.raw === "string" ? record.raw : JSON.stringify(record.raw);

    return {
      id: crypto.randomUUID(),
      ingestionId: record.id,
      content,
      metadata: {
        source: record.source,
        receivedAt: record.receivedAt,
        length: content.length,
      },
    };
  }
}

export function createProcessingService(): ProcessingService {
  return new BasicProcessingService();
}
