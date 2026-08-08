import type { AIGenerateRequest, AIGenerateResult, AIProvider } from "../types.js";
import { AIProviderError } from "../errors.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Real implementation against Anthropic's actual Messages API. Plain
 * fetch rather than the SDK: the request/response shape needed here is
 * small, and it keeps this package's dependency count down.
 */
export class AnthropicProvider implements AIProvider {
    readonly name = "anthropic";

    constructor(private readonly apiKey: string) { }

    async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
        const start = Date.now();

        let response: Response;
        try {
            response = await fetch(ANTHROPIC_API_URL, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": this.apiKey,
                    "anthropic-version": ANTHROPIC_VERSION,
                },
                body: JSON.stringify({
                    model: request.model,
                    max_tokens: request.maxTokens ?? 1024,
                    system: request.systemPrompt,
                    messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
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

        const textBlock = Array.isArray(body?.content)
            ? body.content.find((b: { type: string }) => b.type === "text")
            : undefined;

        return {
            content: textBlock?.text ?? "",
            model: request.model,
            provider: this.name,
            usage: {
                inputTokens: body?.usage?.input_tokens ?? 0,
                outputTokens: body?.usage?.output_tokens ?? 0,
            },
            latencyMs,
        };
    }
}
