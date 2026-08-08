import type { EngineContext, EngineDescriptor } from "@parallax/types";
import { AbstractBaseEngine } from "@parallax/shared";

export interface AtlasInput {
  goal: string;
  constraints?: string[];
}

export interface AtlasStep {
  order: number;
  description: string;
  kind: "constraint" | "clause";
}

export interface AtlasOutput {
  goal: string;
  steps: AtlasStep[];
  complexity: "low" | "moderate" | "high";
  informedByContext: number;
}

/**
 * Splits a goal into clauses on common conjunctions. Deliberately simple
 * and deterministic: real natural-language understanding is Milestone 5's
 * job (AI provider integration). This gives the Orchestrator, tests, and
 * Echo something real and inspectable to work with in the meantime.
 */
function splitIntoClauses(goal: string): string[] {
  return goal
    .split(/\s*(?:,|;|\bthen\b|\band\b)\s*/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function estimateComplexity(stepCount: number): AtlasOutput["complexity"] {
  if (stepCount <= 3) return "low";
  if (stepCount <= 6) return "moderate";
  return "high";
}

export class AtlasEngine extends AbstractBaseEngine {
  readonly descriptor: EngineDescriptor = {
    name: "atlas",
    version: "0.2.0",
    description: "Core reasoning, context interpretation, and planning.",
  };

  protected async doProcess(context: EngineContext): Promise<AtlasOutput> {
    const input = context.input as AtlasInput;
    if (!input?.goal?.trim()) {
      throw new Error("AtlasEngine requires a non-empty input.goal");
    }

    const constraintSteps: AtlasStep[] = (input.constraints ?? []).map((c, i) => ({
      order: i,
      description: `Respect constraint: ${c}`,
      kind: "constraint",
    }));

    const clauseSteps: AtlasStep[] = splitIntoClauses(input.goal).map((clause, i) => ({
      order: constraintSteps.length + i,
      description: clause,
      kind: "clause",
    }));

    const steps = [...constraintSteps, ...clauseSteps];

    return {
      goal: input.goal,
      steps,
      complexity: estimateComplexity(steps.length),
      informedByContext: context.dataHubContext?.chunks.length ?? 0,
    };
  }
}
