export type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Scoped logger so each package's logs are tagged with where they came from. */
export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => log("debug", scope, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => log("info", scope, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log("warn", scope, message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log("error", scope, message, meta),
  };
}
