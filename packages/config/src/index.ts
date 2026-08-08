/**
 * Central config loader. Every package reads environment values through
 * getConfig(), never through process.env directly, so we have one place
 * that knows what variables exist and what their defaults are.
 */

export interface ParallaxConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  databaseUrl: string;
  aiProvider: string;
  aiApiKey: string;
  aiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  webOrigin: string;
}

function readEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

let cached: ParallaxConfig | null = null;

export function getConfig(): ParallaxConfig {
  if (cached) return cached;

  cached = {
    nodeEnv: (process.env.NODE_ENV as ParallaxConfig["nodeEnv"]) ?? "development",
    port: Number(readEnv("PORT", "4000")),
    databaseUrl: readEnv("DATABASE_URL", "postgres://localhost:5432/parallax"),
    aiProvider: readEnv("AI_PROVIDER", "anthropic"),
    // Optional: leave empty to boot the API without an AI provider wired.
    // The /ai/generate route will then return a clear "not configured" error
    // rather than the server failing to start.
    aiApiKey: readEnv("AI_API_KEY", ""),
    aiModel: readEnv("AI_MODEL", "claude-3-5-sonnet-latest"),
    openaiApiKey: readEnv("OPENAI_API_KEY", ""),
    openaiModel: readEnv("OPENAI_MODEL", "gpt-4o-mini"),
    webOrigin: readEnv("WEB_ORIGIN", "http://localhost:5173"),
  };

  return cached;
}

/** Test-only escape hatch so config can be reset between test files. */
export function __resetConfigForTests(): void {
  cached = null;
}
