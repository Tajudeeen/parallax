import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { createLogger } from "@parallax/shared";

const logger = createLogger("http");

/**
 * Attaches a request id (X-Request-Id) and emits one structured JSON access
 * log line per request with timing. The logger already emits JSON; this adds
 * the request id so a single request can be correlated across packages.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

export function accessLog(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const requestId = (req as Request & { requestId?: string }).requestId ?? "-";
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info("request", {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(ms),
      ip: req.ip,
    });
  });
  next();
}
