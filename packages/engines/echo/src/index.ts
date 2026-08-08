import type { EngineContext, EngineDescriptor } from "@parallax/types";
import { AbstractBaseEngine } from "@parallax/shared";

export interface EchoInput {
  audience: "user" | "system";
  data: unknown;
}

export interface EchoOutput {
  message: string;
}

interface AtlasLikeOutput {
  goal: string;
  steps: { order: number; description: string; kind: string }[];
  complexity: string;
}

interface PrismLikeOutput {
  count: number;
  fields: Record<string, { avg: number; median: number; trend: string }>;
}

interface SentinelLikeOutput {
  trustScore: number;
  issues: string[];
  anomalies: { field: string; zScore: number }[];
}

function isAtlasLike(data: unknown): data is AtlasLikeOutput {
  return typeof data === "object" && data !== null && "goal" in data && "steps" in data;
}

function isPrismLike(data: unknown): data is PrismLikeOutput {
  return typeof data === "object" && data !== null && "count" in data && "fields" in data;
}

function isSentinelLike(data: unknown): data is SentinelLikeOutput {
  return typeof data === "object" && data !== null && "trustScore" in data && "issues" in data;
}

function formatAtlas(data: AtlasLikeOutput): string {
  const steps = data.steps.map((s, i) => `${i + 1}. ${s.description}`).join("\n");
  return `Plan for "${data.goal}" (${data.complexity} complexity):\n${steps}`;
}

function formatPrism(data: PrismLikeOutput): string {
  const summaries = Object.entries(data.fields).map(
    ([name, stats]) => `${name}: avg ${stats.avg.toFixed(2)}, median ${stats.median.toFixed(2)}, trending ${stats.trend}`,
  );
  return `Analyzed ${data.count} records.\n${summaries.join("\n")}`;
}

function formatSentinel(data: SentinelLikeOutput): string {
  const pct = Math.round(data.trustScore * 100);
  const lines = [`Trust score: ${pct}%`];
  if (data.issues.length) lines.push(`Issues: ${data.issues.join("; ")}`);
  if (data.anomalies.length) {
    lines.push(
      `Anomalies: ${data.anomalies.map((a) => `${a.field} (z=${a.zScore.toFixed(2)})`).join(", ")}`,
    );
  }
  return lines.join("\n");
}

/**
 * Communication intelligence: turns another engine's structured output
 * into genuinely tailored prose, not JSON.stringify. Recognizes the shape
 * of Atlas, Prism, and Sentinel output specifically; anything else falls
 * back to a plain, honest rendering. Real natural-language generation via
 * an actual model is Milestone 5's job.
 */
export class EchoEngine extends AbstractBaseEngine {
  readonly descriptor: EngineDescriptor = {
    name: "echo",
    version: "0.2.0",
    description: "Human-readable explanations, responses, and notifications.",
  };

  protected async doProcess(context: EngineContext): Promise<EchoOutput> {
    const input = context.input as EchoInput;
    if (!input?.data) {
      throw new Error("EchoEngine requires input.data");
    }

    if (input.audience === "system") {
      return { message: `[system] ${JSON.stringify(input.data)}` };
    }

    return { message: this.humanize(input.data) };
  }

  private humanize(data: unknown): string {
    if (typeof data === "string") return data;
    if (isAtlasLike(data)) return formatAtlas(data);
    if (isPrismLike(data)) return formatPrism(data);
    if (isSentinelLike(data)) return formatSentinel(data);
    return `Here's what I found: ${JSON.stringify(data)}`;
  }
}
