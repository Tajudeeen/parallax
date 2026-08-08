import type { AIProvider } from "../types.js";
import type { ModelCandidate } from "../router.js";
import { getConfig } from "@parallax/config";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";

/**
 * Builds the ordered list of model candidates the AIRouter will try in
 * sequence. Each configured provider contributes its candidate(s); the
 * router falls through to the next on any failure, which is the platform's
 * "fallback models" behavior. Providers without a configured API key are
 * skipped entirely (never half-wired), so the router only ever holds
 * candidates it can actually call.
 */
export function buildModelCandidates(): ModelCandidate[] {
    const { aiProvider, aiApiKey, aiModel } = getConfig();
    const candidates: ModelCandidate[] = [];

    // Keep the order deterministic: the explicit aiProvider first, then the
    // other provider, so a configured fallback always trails the primary.
    const order: Array<"anthropic" | "openai"> =
        aiProvider === "openai" ? ["openai", "anthropic"] : ["anthropic", "openai"];

    for (const name of order) {
        if (name === "anthropic") {
            const key = process.env.ANTHROPIC_API_KEY ?? (aiProvider === "anthropic" ? aiApiKey : "");
            if (key) {
                candidates.push({
                    provider: new AnthropicProvider(key),
                    model: aiModel,
                });
            }
        } else {
            const openaiKey = process.env.OPENAI_API_KEY ?? (aiProvider === "openai" ? aiApiKey : "");
            if (openaiKey) {
                candidates.push({
                    provider: new OpenAIProvider(openaiKey),
                    model: process.env.OPENAI_MODEL ?? aiModel,
                });
            }
        }
    }

    return candidates;
}
