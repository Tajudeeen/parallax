export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
    role: AIRole;
    content: string;
}

export interface AIGenerateRequest {
    model: string;
    messages: AIMessage[];
    systemPrompt?: string;
    maxTokens?: number;
}

export interface AIUsage {
    inputTokens: number;
    outputTokens: number;
}

export interface AIGenerateResult {
    content: string;
    model: string;
    provider: string;
    usage: AIUsage;
    latencyMs: number;
}

export interface AIProvider {
    readonly name: string;
    generate(request: AIGenerateRequest): Promise<AIGenerateResult>;
}