import { describe, it, expect } from "vitest";
import { AtlasEngine } from "@parallax/engine-atlas";
import { PrismEngine } from "@parallax/engine-prism";
import { SentinelEngine } from "@parallax/engine-sentinel";
import { EchoEngine } from "@parallax/engine-echo";
import type { EngineContext } from "@parallax/types";

function ctx(input: unknown, opts: Partial<EngineContext> = {}): EngineContext {
  return { requestId: "test-" + Math.random().toString(36).slice(2), input, ...opts };
}

describe("AtlasEngine", () => {
  it("decomposes a conjoined goal into multiple steps", async () => {
    const e = new AtlasEngine();
    await e.initialize();
    const res = await e.process(ctx({ goal: "Launch the API and deploy it to prod" }));
    expect(res.success).toBe(true);
    const out = res.output as { steps: unknown[]; complexity: string };
    expect(Array.isArray(out.steps)).toBe(true);
    expect(out.steps.length).toBeGreaterThan(1);
    expect(["low", "medium", "high"]).toContain(out.complexity);
  });
});

describe("PrismEngine", () => {
  it("computes real statistics on numeric fields", async () => {
    const e = new PrismEngine();
    await e.initialize();
    const res = await e.process(ctx({ records: [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }, { x: 5 }] }));
    expect(res.success).toBe(true);
    const out = res.output as { fields: Record<string, { avg: number; median: number; stdDev: number }> };
    expect(out.fields.x.avg).toBeCloseTo(3, 5);
    expect(out.fields.x.median).toBe(3);
    expect(out.fields.x.stdDev).toBeCloseTo(Math.sqrt(2), 5);
  });

  it("flags an extreme outlier", async () => {
    const e = new PrismEngine();
    await e.initialize();
    const res = await e.process(ctx({ records: [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }, { v: 1000 }] }));
    const out = res.output as { fields: Record<string, { outliers: { index: number; value: number }[] }> };
    expect(out.fields.v.outliers.some((o) => o.value === 1000)).toBe(true);
  });
});

describe("SentinelEngine", () => {
  it("passes a payload that satisfies the rules", async () => {
    const e = new SentinelEngine();
    await e.initialize();
    const res = await e.process(ctx({
      payload: { user: "bob", age: 30 },
      rules: [
        { field: "user", required: true, type: "string" },
        { field: "age", required: true, type: "number" },
      ],
    }));
    expect(res.success).toBe(true);
    const out = res.output as { trustScore: number; issues: string[] };
    expect(out.issues.length).toBe(0);
    expect(out.trustScore).toBeGreaterThan(0);
  });

  it("reports issues for a type mismatch", async () => {
    const e = new SentinelEngine();
    await e.initialize();
    const res = await e.process(ctx({
      payload: { age: "not-a-number" },
      rules: [{ field: "age", required: true, type: "number" }],
    }));
    const out = res.output as { issues: string[] };
    expect(out.issues.some((i) => i.includes("age"))).toBe(true);
  });
});

describe("EchoEngine", () => {
  it("produces tailored prose for an Atlas-shaped output", async () => {
    const e = new EchoEngine();
    await e.initialize();
    const res = await e.process(ctx({
      audience: "user",
      data: { steps: [{ step: 1, description: "do x" }], complexity: "low" },
    }));
    expect(res.success).toBe(true);
    const out = res.output as { message: string };
    expect(typeof out.message).toBe("string");
    expect(out.message.length).toBeGreaterThan(0);
  });
});
