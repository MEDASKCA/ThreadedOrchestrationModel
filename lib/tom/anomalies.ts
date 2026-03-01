import { prisma } from "@/lib/tom/db";
import type { MetricPointInput } from "@/lib/tom/metrics";
import { ANOMALY_THRESHOLDS, METRIC_SEVERITY } from "@/lib/tom/anomaly-config";

type BaselineRow = {
  metricName: string;
  scope: string;
  scopeId: string | null;
  baselineValue: number;
  standardDeviation: number;
  dataVolume: number;
  baselineWindowDays: number;
};

const percentChange = (current: number, baseline: number) => {
  if (baseline === 0) return current === 0 ? 0 : 1;
  return (current - baseline) / baseline;
};

const zScore = (current: number, baseline: number, sd: number) => {
  if (sd === 0) return 0;
  return (current - baseline) / sd;
};

const confidenceLevel = (volume: number, deviation: number) => {
  if (volume >= 50 && Math.abs(deviation) >= 2.5) return "high";
  if (volume >= 20 && Math.abs(deviation) >= 1.5) return "medium";
  return "low";
};

const severityLevel = (metricName: string, deviation: number) => {
  const base = METRIC_SEVERITY[metricName] ?? "low";
  if (Math.abs(deviation) >= ANOMALY_THRESHOLDS.severityEscalation) {
    return base === "low" ? "medium" : base === "medium" ? "high" : "high";
  }
  return base;
};

const buildExplanation = (payload: {
  metricName: string;
  scope: string;
  scopeId?: string | null;
  baselineValue: number;
  currentValue: number;
  baselineWindowDays: number;
  currentWindowDays: number;
  percentageChange: number;
  confidence: string;
}) => {
  const scopeText =
    payload.scope === "system"
      ? "system-wide"
      : `${payload.scope} ${payload.scopeId ?? ""}`.trim();
  const change = Math.round(payload.percentageChange * 100);
  return `Metric ${payload.metricName} shifted ${change}% vs baseline for ${scopeText} over the last ${payload.currentWindowDays} days. Baseline window: ${payload.baselineWindowDays} days. Confidence: ${payload.confidence}.`;
};

export const detectAnomalies = async (
  currentMetrics: MetricPointInput[],
  currentWindowDays = 7,
) => {
  const baselines = await prisma.baseline.findMany();
  const baselineIndex = new Map<string, BaselineRow>();
  baselines.forEach((b) => {
    baselineIndex.set(`${b.metricName}|${b.scope}|${b.scopeId ?? ""}`, b);
  });

  const anomalies = [];
  for (const metric of currentMetrics) {
    if (metric.volume < ANOMALY_THRESHOLDS.minVolume) continue;
    const key = `${metric.metricName}|${metric.scope}|${metric.scopeId ?? ""}`;
    const baseline = baselineIndex.get(key);
    if (!baseline) continue;

    const pct = percentChange(metric.value, baseline.baselineValue);
    const z = zScore(metric.value, baseline.baselineValue, baseline.standardDeviation);
    const exceeds =
      Math.abs(pct) >= ANOMALY_THRESHOLDS.percentChange ||
      Math.abs(z) >= ANOMALY_THRESHOLDS.zScore;
    if (!exceeds) continue;

    const confidence = confidenceLevel(metric.volume, z);
    const severity = severityLevel(metric.metricName, pct);
    const explanation = buildExplanation({
      metricName: metric.metricName,
      scope: metric.scope,
      scopeId: metric.scopeId,
      baselineValue: baseline.baselineValue,
      currentValue: metric.value,
      baselineWindowDays: baseline.baselineWindowDays,
      currentWindowDays,
      percentageChange: pct,
      confidence,
    });

    const transparencyPayload = {
      metric: metric.metricName,
      scope: metric.scope,
      baseline_window: `${baseline.baselineWindowDays}d`,
      current_window: `${currentWindowDays}d`,
      baseline_value: baseline.baselineValue,
      current_value: metric.value,
      percentage_change: pct,
      standard_deviation_delta: z,
      volume_context: metric.volume,
      severity,
      confidence,
      projected_impact: "Operational risk trend detected",
      explanation,
    };

    anomalies.push({
      metricName: metric.metricName,
      scope: metric.scope,
      scopeId: metric.scopeId ?? null,
      baselineWindowDays: baseline.baselineWindowDays,
      currentWindowDays,
      baselineValue: baseline.baselineValue,
      currentValue: metric.value,
      percentageChange: pct,
      standardDeviationDelta: z,
      volumeContext: metric.volume,
      severity,
      confidence,
      projectedImpact: "Operational risk trend detected",
      explanation,
      transparencyPayload,
    });
  }

  if (anomalies.length === 0) return [];

  const persisted = [];
  for (const anomaly of anomalies) {
    const existing = await prisma.anomaly.findFirst({
      where: {
        metricName: anomaly.metricName,
        scope: anomaly.scope,
        scopeId: anomaly.scopeId,
        status: "open",
      },
    });

    if (existing) {
      const existingHistory = (existing.severityHistory as any)?.entries ?? [];
      const updated = await prisma.anomaly.update({
        where: { id: existing.id },
        data: {
          currentWindowDays: anomaly.currentWindowDays,
          baselineValue: anomaly.baselineValue,
          currentValue: anomaly.currentValue,
          percentageChange: anomaly.percentageChange,
          standardDeviationDelta: anomaly.standardDeviationDelta,
          volumeContext: anomaly.volumeContext,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
          projectedImpact: anomaly.projectedImpact,
          explanation: anomaly.explanation,
          transparencyPayload: anomaly.transparencyPayload,
          severityHistory: {
            entries: [
              ...existingHistory,
              { at: new Date().toISOString(), severity: anomaly.severity },
            ],
          },
        },
      });
      await prisma.anomalyHistory.create({
        data: {
          anomalyId: existing.id,
          eventType: "updated",
          payload: {
            severity: anomaly.severity,
            confidence: anomaly.confidence,
            percentageChange: anomaly.percentageChange,
          },
        },
      });
      persisted.push(updated);
    } else {
      const created = await prisma.anomaly.create({
        data: {
          metricName: anomaly.metricName,
          scope: anomaly.scope,
          scopeId: anomaly.scopeId ?? null,
          baselineWindowDays: anomaly.baselineWindowDays,
          currentWindowDays: anomaly.currentWindowDays,
          baselineValue: anomaly.baselineValue,
          currentValue: anomaly.currentValue,
          percentageChange: anomaly.percentageChange,
          standardDeviationDelta: anomaly.standardDeviationDelta,
          volumeContext: anomaly.volumeContext,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
          projectedImpact: anomaly.projectedImpact,
          explanation: anomaly.explanation,
          transparencyPayload: anomaly.transparencyPayload,
          history: { events: [] },
          severityHistory: { entries: [{ at: new Date().toISOString(), severity: anomaly.severity }] },
        },
      });
      await prisma.anomalyHistory.create({
        data: {
          anomalyId: created.id,
          eventType: "created",
          payload: {
            severity: anomaly.severity,
            confidence: anomaly.confidence,
            percentageChange: anomaly.percentageChange,
          },
        },
      });
      persisted.push(created);
    }
  }

  return persisted;
};
