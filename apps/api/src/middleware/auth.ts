import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../auth/service.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  try {
    const { userId, email } = AuthService.verifyToken(header.slice("Bearer ".length));
    req.userId = userId;
    req.userEmail = email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
