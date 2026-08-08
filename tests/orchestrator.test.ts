import { describe, it, expect, vi } from "vitest";
import { Orchestrator, EngineRegistry, createOrchestrator } from "@parallax/orchestrator";
import { AtlasEngine } from "@parallax/engine-atlas";
import { EchoEngine } from "@parallax/engine-echo";
import { SentinelEngine } from "@parallax/engine-sentinel";
import { listWorkflows } from "@parallax/orchestrator";
import type { DataHub, DataHubContext } from "@parallax/types";

function fakeDataHub() {
  const dh = {
    getContext: vi.fn(async (): Promise<DataHubContext> => ({ chunks: [], memory: {} })),
    memory: { set: vi.fn(), get: vi.fn(), all: vi.fn(async () => ({})) },
  };
  return dh as unknown as DataHub;
}

function registry() {
  const r = new EngineRegistry();
  r.register(new AtlasEngine());
  r.register(new EchoEngine());
  r.register(new SentinelEngine());
  return r;
}

describe("Orchestrator.route", () => {
  it("routes a task to an engine and records completion", async () => {
    const o = new Orchestrator(registry(), fakeDataHub());
    await o.initialize();
    const task = await o.route("atlas", { requestId: "r1", input: { goal: "launch and deploy" } });
    expect(task.status).toBe("completed");
    expect(task.engine).toBe("atlas");
  });

  it("propagates an unknown engine name as an error (not a failed task)", async () => {
    const o = new Orchestrator(registry(), fakeDataHub());
    await o.initialize();
    await expect(o.route("does-not-exist" as never, { requestId: "r2", input: "x" }))
      .rejects.toThrow();
  });

  it("threads DataHub context into the engine", async () => {
    const dh = fakeDataHub();
    const o = new Orchestrator(registry(), dh);
    await o.initialize();
    await o.route("atlas", { requestId: "r3", input: { goal: "plan something" } });
    expect(dh.getContext).toHaveBeenCalledOnce();
  });
});

describe("Orchestrator.runWorkflow", () => {
  it("composes plan-and-explain across engines", async () => {
    const o = new Orchestrator(registry(), fakeDataHub());
    await o.initialize();
    const [planAndExplain] = listWorkflows();
    const run = await o.runWorkflow(planAndExplain, "launch the API then deploy");
    expect(run.status).toBe("completed");
    expect(run.steps.length).toBe(2);
    expect(run.steps[0].engine).toBe("atlas");
    expect(run.steps[1].engine).toBe("echo");
    expect(typeof (run.output as { message: string }).message).toBe("string");
  });
});
