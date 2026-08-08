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


/**
 * Fail-fast validation for production boots. In development/test the
 * config's built-in defaults (localhost Postgres, empty AI keys) are fine,
 * but a production process pointing at a default localhost database URL or
 * missing provider keys is a misconfiguration that should surface as a clear
 * error at startup, not as a cryptic connect-time crash later.
 *
 * Returns a list of human-readable problems. Empty list means OK.
 */
export function validateConfigForEnv(config: ParallaxConfig = getConfig()): string[] {
  const problems: string[] = [];

  if (config.nodeEnv === "production") {
    if (!config.databaseUrl || config.databaseUrl.includes("localhost")) {
      problems.push(
        "DATABASE_URL must point at a real Postgres instance in production (got a localhost/default value).",
      );
    }
    if (config.aiProvider === "anthropic" && !config.aiApiKey) {
      problems.push("AI_PROVIDER=anthropic but AI_API_KEY is empty; the AI layer will be unavailable.");
    }
    if (config.aiProvider === "openai" && !config.openaiApiKey) {
      problems.push("AI_PROVIDER=openai but OPENAI_API_KEY is empty; the AI layer will be unavailable.");
    }
    if (!config.webOrigin || config.webOrigin.includes("localhost")) {
      problems.push("WEB_ORIGIN should be the real frontend origin in production.");
    }
  }

  return problems;
}
