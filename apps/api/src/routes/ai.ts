import { Router } from "express";
import type { AIGenerateRequest } from "@parallax/ai";
import { AIRouter, buildModelCandidates } from "@parallax/ai";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

/**
 * Builds the AI router. The AIRouter is composed here from buildModelCandidates(),
 * which assembles every configured provider's candidate in a deterministic
 * order (primary provider first, the other as fallback). Every call, success
 * or failure, is logged to ai_usage_records by the router. If a candidate
 * fails, the router automatically falls through to the next — that is the
 * platform's "fallback models" behavior, and it needs no code change to add
 * or remove a provider, only env vars.
 *
 * 401s are left to requireAuth; this route only validates the body and
 * surfaces AIProviderError as a 502 (upstream provider failure), which is
 * the honest status for "the model call failed".
 */
export function createAiRouter(): Router {
  const router = Router();
  const candidates = buildModelCandidates();
  const routerInstance = candidates.length ? new AIRouter(candidates) : null;

  router.post("/generate", requireAuth, async (req: AuthenticatedRequest, res, next) => {
    if (!routerInstance) {
      res.status(503).json({
        error: "AI provider not configured",
        detail: "Set AI_PROVIDER (and a provider API key) to enable the AI layer.",
      });
      return;
    }

    const body = req.body as Partial<AIGenerateRequest>;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const request: Omit<AIGenerateRequest, "model"> = {
      messages: body.messages!,
      systemPrompt: body.systemPrompt,
      maxTokens: body.maxTokens,
    };

    try {
      const result = await routerInstance.generate(request);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
