import { getDb, schema } from "@parallax/database";
import { createLogger } from "@parallax/shared";

const logger = createLogger("ai-usage-repository");

export interface UsageRecordInput {
    provider: string;
    model: string;
    success: boolean;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    errorMessage?: string;
}

/**
 * Records AI usage to ai_usage_records. Deliberately non-throwing: usage
 * logging is observability, not a critical path. If the database is down or
 * the write fails, the model call that preceded it must still succeed — we
 * log the failure and move on rather than masking a good generation with a
 * logging error.
 */
export const UsageRepository = {
    async record(input: UsageRecordInput): Promise<void> {
        try {
            await getDb()
                .insert(schema.aiUsageRecords)
                .values({
                    id: crypto.randomUUID(),
                    provider: input.provider,
                    model: input.model,
                    success: input.success,
                    inputTokens: input.inputTokens,
                    outputTokens: input.outputTokens,
                    latencyMs: input.latencyMs,
                    errorMessage: input.errorMessage,
                });
        } catch (err) {
            logger.warn("failed to record ai usage", {
                provider: input.provider,
                model: input.model,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    },
};
