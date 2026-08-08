import { describe, it, expect, vi } from "vitest";
import { AIRouter } from "@parallax/ai";
import { optimizeContext } from "@parallax/ai";
import { AnthropicProvider } from "@parallax/ai";
import { OpenAIProvider } from "@parallax/ai";
import type { DataHubContext } from "@parallax/types";

describe("optimizeContext", () => {
  it("is a pass-through with no budget when context fits trivially", () => {
    const ctx: DataHubContext = { chunks: [{ id: "c", content: "hello", score: 1 }], memory: { a: 1 } };
    const out = optimizeContext(ctx, 1_000_000);
    expect(out.selectedChunks.length).toBe(1);
    expect(out.memory).toEqual({ a: 1 });
  });

  it("drops oversized memory wholesale rather than truncating it", () => {
    const bigMemory = { big: "x".repeat(10_000) };
    const ctx: DataHubContext = { chunks: [{ id: "c", content: "hi", score: 2 }], memory: bigMemory };
    const out = optimizeContext(ctx, 20); // tiny budget
    expect(out.memory).toEqual({});
    expect(out.selectedChunks.length).toBeGreaterThanOrEqual(0);
  });

  it("keeps highest-scoring chunks first under budget", () => {
    const ctx: DataHubContext = {
      chunks: [
        { id: "low", content: "low", score: 1 },
        { id: "high", content: "high score chunk", score: 9 },
        { id: "mid", content: "mid", score: 5 },
      ],
      memory: {},
    };
    const out = optimizeContext(ctx, 30);
    expect(out.selectedChunks[0].id).toBe("high");
  });
});

describe("AIRouter fallback", () => {
  function fakeFetch(target: string) {
    return async (url: string | URL, _init?: unknown) => {
      const isAnthropic = String(url).includes("anthropic.com");
      const provider = isAnthropic ? "anthropic" : "openai";
      if (provider === target) {
        const body = isAnthropic
          ? { content: [{ type: "text", text: provider + "-OK" }], usage: { input_tokens: 1, output_tokens: 2 } }
          : { choices: [{ message: { content: provider + "-OK" } }], usage: { prompt_tokens: 1, completion_tokens: 2 } };
        return { ok: true, status: 200, json: async () => body };
      }
      return { ok: false, status: 500, json: async () => ({ error: { message: "boom" } }) };
    };
  }

  it("uses the primary provider when healthy", async () => {
    const real = global.fetch;
    // @ts-expect-error test stub
    global.fetch = fakeFetch("anthropic");
    try {
      const router = new AIRouter([{ provider: new AnthropicProvider("k"), model: "m" }]);
      const r = await router.generate({ messages: [{ role: "user", content: "hi" }] });
      expect(r.provider).toBe("anthropic");
      expect(r.content).toBe("anthropic-OK");
    } finally {
      global.fetch = real;
    }
  });

  it("falls through to the next candidate when the primary fails", async () => {
    const real = global.fetch;
    // @ts-expect-error test stub
    global.fetch = fakeFetch("openai");
    try {
      const router = new AIRouter([
        { provider: new AnthropicProvider("k"), model: "m" },
        { provider: new OpenAIProvider("k"), model: "m" },
      ]);
      const r = await router.generate({ messages: [{ role: "user", content: "hi" }] });
      expect(r.provider).toBe("openai");
      expect(r.content).toBe("openai-OK");
    } finally {
      global.fetch = real;
    }
  });
});
