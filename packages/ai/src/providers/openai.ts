import type { AIGenerateRequest, AIGenerateResult, AIProvider } from "../types.js";
import { AIProviderError } from "../errors.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Real implementation against OpenAI's Chat Completions API. Mirrors the
 * shape of AnthropicProvider so both are interchangeable behind AIRouter:
 * same generate() contract, same error wrapping, no SDK dependency.
 */
export class OpenAIProvider implements AIProvider {
    readonly name = "openai";

    constructor(private readonly apiKey: string) { }

    async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
        const start = Date.now();

        let response: Response;
        try {
            response = await fetch(OPENAI_API_URL, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: request.model,
                    max_tokens: request.maxTokens ?? 1024,
                    messages: [
                        ...(request.systemPrompt ? [{ role: "system", content: request.systemPrompt }] : []),
                        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
                    ],
                }),
            });
        } catch (err) {
            throw new AIProviderError(
                this.name,
                request.model,
                `network error: ${err instanceof Error ? err.message : String(err)}`,
            );
        }

        const latencyMs = Date.now() - start;
        const body: any = await response.json().catch(() => null);

        if (!response.ok) {
            const reason = body?.error?.message ?? `HTTP ${response.status}`;
            throw new AIProviderError(this.name, request.model, reason, response.status);
        }

        return {
            content: body?.choices?.[0]?.message?.content ?? "",
            model: request.model,
            provider: this.name,
            usage: {
                inputTokens: body?.usage?.prompt_tokens ?? 0,
                outputTokens: body?.usage?.completion_tokens ?? 0,
            },
            latencyMs,
        };
    }
}
