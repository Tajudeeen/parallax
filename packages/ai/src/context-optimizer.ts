import type { DataHubContext, RetrievedChunk } from "@parallax/types";

/** Rough, standard approximation: ~4 characters per token for English text. */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export interface OptimizedContext {
    selectedChunks: RetrievedChunk[];
    memory: Record<string, unknown>;
    estimatedTokens: number;
}

/**
 * Fits DataHub-retrieved context into a token budget: highest-scoring
 * chunks first, memory included whole unless it alone would blow the
 * budget, in which case it's dropped entirely rather than silently
 * truncated into something misleading.
 */
export function optimizeContext(context: DataHubContext | undefined, tokenBudget: number): OptimizedContext {
    if (!context) {
        return { selectedChunks: [], memory: {}, estimatedTokens: 0 };
    }

    const sorted = [...context.chunks].sort((a, b) => b.score - a.score);
    const selectedChunks: RetrievedChunk[] = [];
    let used = 0;

    for (const chunk of sorted) {
        const cost = estimateTokens(chunk.content);
        if (used + cost > tokenBudget) break;
        selectedChunks.push(chunk);
        used += cost;
    }

    const memoryText = context.memory ? JSON.stringify(context.memory) : "";
    const memoryCost = estimateTokens(memoryText);
    const fitsMemory = used + memoryCost <= tokenBudget;

    return {
        selectedChunks,
        memory: fitsMemory ? context.memory ?? {} : {},
        estimatedTokens: fitsMemory ? used + memoryCost : used,
    };
}