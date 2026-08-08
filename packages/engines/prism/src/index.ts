import type { EngineContext, EngineDescriptor } from "@parallax/types";
import { AbstractBaseEngine } from "@parallax/shared";

export interface PrismInput {
  records: Record<string, number>[];
}

export interface FieldStats {
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
  outliers: { index: number; value: number }[];
  trend: "increasing" | "decreasing" | "flat";
}

export interface PrismOutput {
  count: number;
  fields: Record<string, FieldStats>;
  correlations: { fieldA: string; fieldB: string; coefficient: number }[];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(values: number[], avg: number): number {
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

/** Simple linear regression slope of value against its index (implicit sequence). */
function trendSlope(values: number[]): number {
  const n = values.length;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const aMean = mean(a);
  const bMean = mean(b);
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - aMean) * (b[i] - bMean);
    denA += (a[i] - aMean) ** 2;
    denB += (b[i] - bMean) ** 2;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

/**
 * Pattern detection, analysis, and insight generation, real statistics
 * rather than placeholders: min/max/avg/median/standard deviation, outlier
 * detection (beyond 2 standard deviations), a linear trend per field, and
 * pairwise Pearson correlation between every pair of numeric fields.
 */
export class PrismEngine extends AbstractBaseEngine {
  readonly descriptor: EngineDescriptor = {
    name: "prism",
    version: "0.2.0",
    description: "Pattern detection, analysis, and insight generation.",
  };

  protected async doProcess(context: EngineContext): Promise<PrismOutput> {
    const input = context.input as PrismInput;
    if (!input?.records?.length) {
      throw new Error("PrismEngine requires a non-empty input.records array");
    }

    const fieldNames = Object.keys(input.records[0]);
    const fieldValues: Record<string, number[]> = {};
    const fields: Record<string, FieldStats> = {};

    for (const field of fieldNames) {
      const values = input.records
        .map((r) => r[field])
        .filter((v): v is number => typeof v === "number");
      fieldValues[field] = values;

      const avg = mean(values);
      const sd = stdDev(values, avg);
      const outliers = values
        .map((v, index) => ({ index, value: v }))
        .filter(({ value }) => sd > 0 && Math.abs(value - avg) > 2 * sd);

      // Trend is computed on the non-outlier subset. A single extreme
      // value otherwise dominates a linear regression slope and reports
      // "increasing" or "decreasing" even when the rest of the series is
      // flat, which is technically correct but misleading to read.
      const outlierIndices = new Set(outliers.map((o) => o.index));
      const trendValues = values.filter((_, i) => !outlierIndices.has(i));
      const slope = trendValues.length >= 2 ? trendSlope(trendValues) : 0;
      const trend: FieldStats["trend"] = Math.abs(slope) < 1e-6 ? "flat" : slope > 0 ? "increasing" : "decreasing";

      fields[field] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg,
        median: median(values),
        stdDev: sd,
        outliers,
        trend,
      };
    }

    const correlations: PrismOutput["correlations"] = [];
    for (let i = 0; i < fieldNames.length; i++) {
      for (let j = i + 1; j < fieldNames.length; j++) {
        const fieldA = fieldNames[i];
        const fieldB = fieldNames[j];
        correlations.push({
          fieldA,
          fieldB,
          coefficient: pearsonCorrelation(fieldValues[fieldA], fieldValues[fieldB]),
        });
      }
    }

    return { count: input.records.length, fields, correlations };
  }
}
