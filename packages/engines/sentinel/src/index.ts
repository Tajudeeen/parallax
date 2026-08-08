import type { EngineContext, EngineDescriptor, EngineValidationResult, MemoryWrite } from "@parallax/types";
import { AbstractBaseEngine } from "@parallax/shared";

export interface SentinelRule {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "boolean";
  min?: number;
  max?: number;
  pattern?: string;
}

export interface SentinelInput {
  payload: Record<string, unknown>;
  rules?: SentinelRule[];
  /** Fields to check against a rolling historical baseline, persisted across requests. */
  baselineFields?: string[];
}

export interface AnomalyReport {
  field: string;
  value: number;
  zScore: number;
  baselineMean: number;
  baselineSampleSize: number;
}

export interface SentinelOutput {
  trustScore: number;
  issues: string[];
  anomalies: AnomalyReport[];
}

/** Welford's online algorithm state: numerically stable running mean/variance. */
interface BaselineState {
  count: number;
  mean: number;
  m2: number;
}

function isBaselineState(value: unknown): value is BaselineState {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BaselineState).count === "number" &&
    typeof (value as BaselineState).mean === "number" &&
    typeof (value as BaselineState).m2 === "number"
  );
}

function updateBaseline(prior: BaselineState | undefined, value: number): BaselineState {
  const count = (prior?.count ?? 0) + 1;
  const mean = prior?.mean ?? 0;
  const delta = value - mean;
  const newMean = mean + delta / count;
  const delta2 = value - newMean;
  const m2 = (prior?.m2 ?? 0) + delta * delta2;
  return { count, mean: newMean, m2 };
}

function zScore(state: BaselineState, value: number): number {
  if (state.count < 2) return 0;
  const variance = state.m2 / state.count;
  const sd = Math.sqrt(variance);
  if (sd === 0) {
    // Constant baseline so far: any value that differs from the running
    // mean is, by definition, an outlier relative to that series. Returning
    // 0 here (the previous behavior) let a spike off a flat baseline slip
    // through silently. Report a large but finite z so downstream logging
    // and Echo get a meaningful number instead of a false negative.
    return value === state.mean ? 0 : ANOMALY_THRESHOLD + 1;
  }
  return (value - state.mean) / sd;
}

const ANOMALY_THRESHOLD = 2.5;

/**
 * Validation, risk detection, and trust scoring. Rule checking covers
 * required fields, types, numeric ranges, and regex patterns. Anomaly
 * detection compares a field's value against a rolling baseline persisted
 * in DataHub memory (via Welford's algorithm, numerically stable for
 * streaming data), so trust scoring genuinely improves as more requests
 * come in, not just a fixed rule count.
 */
export class SentinelEngine extends AbstractBaseEngine {
  readonly descriptor: EngineDescriptor = {
    name: "sentinel",
    version: "0.2.0",
    description: "Data validation, risk detection, and trust scoring.",
  };

  async validate(context: EngineContext): Promise<EngineValidationResult> {
    const input = context.input as SentinelInput;
    if (input?.payload === undefined) {
      return { valid: false, reasons: ["SentinelEngine requires input.payload"] };
    }
    return { valid: true };
  }

  private baselineKey(field: string): string {
    return `baseline:${field}`;
  }

  private computeAnomalies(context: EngineContext, input: SentinelInput): AnomalyReport[] {
    const anomalies: AnomalyReport[] = [];
    for (const field of input.baselineFields ?? []) {
      const value = input.payload[field];
      if (typeof value !== "number") continue;

      const stored = context.dataHubContext?.memory?.[this.baselineKey(field)];
      if (!isBaselineState(stored)) continue;

      const z = zScore(stored, value);
      if (Math.abs(z) > ANOMALY_THRESHOLD) {
        anomalies.push({ field, value, zScore: z, baselineMean: stored.mean, baselineSampleSize: stored.count });
      }
    }
    return anomalies;
  }

  protected async doProcess(context: EngineContext): Promise<SentinelOutput> {
    const input = context.input as SentinelInput;
    const issues: string[] = [];

    for (const rule of input.rules ?? []) {
      const value = input.payload[rule.field];

      if (rule.required && (value === undefined || value === null)) {
        issues.push(`Missing required field: ${rule.field}`);
        continue;
      }
      if (value === undefined || value === null) continue;

      if (rule.type && typeof value !== rule.type) {
        issues.push(`Field "${rule.field}" expected type ${rule.type}, got ${typeof value}`);
      }
      if (typeof value === "number") {
        if (rule.min !== undefined && value < rule.min) {
          issues.push(`Field "${rule.field}" value ${value} is below minimum ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          issues.push(`Field "${rule.field}" value ${value} is above maximum ${rule.max}`);
        }
      }
      if (rule.pattern && typeof value === "string" && !new RegExp(rule.pattern).test(value)) {
        issues.push(`Field "${rule.field}" does not match required pattern`);
      }
    }

    const anomalies = this.computeAnomalies(context, input);
    const trustScore = Math.max(0, 1 - issues.length * 0.25 - anomalies.length * 0.15);

    return { trustScore, issues, anomalies };
  }

  protected async getMemoryWrites(context: EngineContext, output: unknown): Promise<MemoryWrite[]> {
    const input = context.input as SentinelInput;
    const writes: MemoryWrite[] = [];

    for (const field of input.baselineFields ?? []) {
      const value = input.payload[field];
      if (typeof value !== "number") continue;

      const stored = context.dataHubContext?.memory?.[this.baselineKey(field)];
      const prior = isBaselineState(stored) ? stored : undefined;
      const updated = updateBaseline(prior, value);

      writes.push({
        scope: context.userId ? "user" : "system",
        key: this.baselineKey(field),
        value: updated,
      });
    }

    return writes;
  }
}
