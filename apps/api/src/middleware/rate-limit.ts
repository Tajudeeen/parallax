import rateLimit from "express-rate-limit";
import { createLogger } from "@parallax/shared";

const logger = createLogger("rate-limit");

/**
 * Protects the paid AI endpoints (and the workflow runner, which can call
 * them) from a single client running up provider bills or tripping
 * upstream rate limits. Auth'd or not, every client IP gets the same
 * ceiling; tune via env if needed.
 */
export const aiRateLimiter = rateLimit({
  windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60_000),
  max: Number(process.env.AI_RATE_LIMIT_MAX ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("rate limit exceeded", { ip: req.ip });
    res.status(429).json({ error: "Too many requests, slow down." });
  },
});
