import { ParallaxError } from "@parallax/shared";

/**
 * Never includes the API key, request body, or raw response body in the
 * message, only status code and a short reason, so this is safe to log
 * or return to a client without leaking credentials.
 */
export class AIProviderError extends ParallaxError {
    constructor(
        public readonly provider: string,
        public readonly model: string,
        message: string,
        public readonly statusCode?: number,
    ) {
        super(`[${provider}:${model}] ${message}`, "AI_PROVIDER_ERROR");
        this.name = "AIProviderError";
    }
}