import type { Request, Response, NextFunction } from "express";
import { ParallaxError, EngineNotFoundError } from "@parallax/shared";
import { AuthError } from "../auth/service.js";
import { AIProviderError } from "@parallax/ai";
import { createLogger } from "@parallax/shared";

const logger = createLogger("api-errors");

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AuthError) {
    res.status(401).json({ error: err.message });
    return;
  }
  if (err instanceof EngineNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  // Upstream model failure is a bad gateway, not a 500: the API itself is
  // healthy, the provider (or our call to it) failed.
  if (err instanceof AIProviderError) {
    res.status(502).json({ error: err.message, provider: err.provider, model: err.model });
    return;
  }
  if (err instanceof ParallaxError) {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }

  logger.error("unhandled error", { error: err instanceof Error ? err.message : String(err) });
  res.status(500).json({ error: "Internal server error" });
}
