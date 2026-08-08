import type { WorkflowDefinition } from "@parallax/types";

/**
 * Built-in agent workflows. Each is a real, ordered composition of the
 * platform's own engines, demonstrating that "coordinate engines" is now a
 * concrete capability rather than a TODO. They run entirely through the
 * Orchestrator's normal route() path, so memory writes, context budgets,
 * and failure semantics are identical to a single engine task.
 */

/**
 * Atlas plans a goal, then Echo explains the plan in human terms. The
 * second step receives Atlas' structured output as its input.
 */
export const planAndExplain: WorkflowDefinition = {
  name: "plan-and-explain",
  description: "Decompose a goal with Atlas, then have Echo render it human-readable.",
  steps: [
    {
      engine: "atlas",
      name: "decompose",
      input: ({ input }) => ({ goal: String(input) }),
    },
    {
      engine: "echo",
      name: "explain",
      input: ({ lastOutput }) => ({ audience: "user", data: lastOutput }),
    },
  ],
};

/**
 * Sentinel validates a payload against rules, then Echo reports the trust
 * score in prose. Skips the explanation if validation produced issues.
 */
export const validateAndReport: WorkflowDefinition = {
  name: "validate-and-report",
  description: "Validate a payload with Sentinel, then Echo the trust score.",
  steps: [
    {
      engine: "sentinel",
      name: "validate",
      input: ({ input }) => input,
    },
    {
      engine: "echo",
      name: "report",
      // Only explain when there's something worth saying (issues or anomalies).
      input: ({ lastOutput }) => {
        const out = lastOutput as { issues: string[]; anomalies: unknown[] } | undefined;
        if (!out || (out.issues.length === 0 && out.anomalies.length === 0)) return undefined;
        return { audience: "user", data: out };
      },
    },
  ],
};

const registry: Record<string, WorkflowDefinition> = {
  [planAndExplain.name]: planAndExplain,
  [validateAndReport.name]: validateAndReport,
};

export function getWorkflow(name: string): WorkflowDefinition | undefined {
  return registry[name];
}

export function listWorkflows(): WorkflowDefinition[] {
  return Object.values(registry);
}
