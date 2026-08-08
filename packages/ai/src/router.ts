import type { AIGenerateRequest, AIGenerateResult, AIProvider } from "./types.js";
import { AIProviderError } from "./errors.js";
import { UsageRepository } from "./usage-repository.js";
import { createLogger } from "@parallax/shared";

const logger = createLogger("ai-router");

export interface ModelCandidate {
    provider: AIProvider;
    model: string;
}

/**
 * Tries each candidate in order. Every attempt, success or failure, is
 * recorded to ai_usage_records, so failed calls (bad key, rate limit,
 * unavailable model) are just as visible as successful ones.
 */
export class AIRouter {
    constructor(private readonly candidates: ModelCandidate[]) { }

    async generate(request: Omit<AIGenerateRequest, "model">): Promise<AIGenerateResult> {
        if (this.candidates.length === 0) {
            throw new AIProviderError("none", "none", "No AI providers configured");
        }

        const attempts: string[] = [];

        for (const candidate of this.candidates) {
            const fullRequest: AIGenerateRequest = { ...request, model: candidate.model };
            try {
                const result = await candidate.provider.generate(fullRequest);
                await UsageRepository.record({
                    provider: candidate.provider.name,
                    model: candidate.model,
                    success: true,
                    inputTokens: result.usage.inputTokens,
                    outputTokens: result.usage.outputTokens,
                    latencyMs: result.latencyMs,
                });
                return result;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                attempts.push(`${candidate.provider.name}:${candidate.model} -> ${message}`);
                await UsageRepository.record({
                    provider: candidate.provider.name,
                    model: candidate.model,
                    success: false,
                    inputTokens: 0,
                    outputTokens: 0,
                    latencyMs: 0,
                    errorMessage: message,
                });
                logger.warn("model candidate failed, trying next", {
                    provider: candidate.provider.name,
                    model: candidate.model,
                });
            }
        }

        throw new AIProviderError("all", "all", `All candidates failed: ${attempts.join(" | ")}`);
    }
}