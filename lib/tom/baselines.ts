import { prisma } from "@/lib/tom/db";
import type { MetricPointInput } from "@/lib/tom/metrics";

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

const stddev = (values: number[], avg: number) => {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
};

export const storeMetricPoints = async (points: MetricPointInput[]) => {
  if (points.length === 0) return [];
  return prisma.metricPoint.createMany({
    data: points.map((point) => ({
      metricName: point.metricName,
      scope: point.scope,
      scopeId: point.scopeId ?? null,
      value: point.value,
      volume: point.volume,
      windowDays: point.windowDays,
      source: point.source,
      recordedAt: new Date(),
    })),
  });
};

export const computeBaselines = async (windowDays = 84) => {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const points = await prisma.metricPoint.findMany({
    where: { recordedAt: { gte: since } },
  });

  const grouped = new Map<string, typeof points>();
  points.forEach((p) => {
    const key = `${p.metricName}|${p.scope}|${p.scopeId ?? ""}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(p);
  });

  const baselines = [];
  for (const [key, rows] of grouped) {
    const [metricName, scope, scopeId] = key.split("|");
    const values = rows.map((r) => r.value);
    const avg = mean(values);
    const sd = stddev(values, avg);
    const volume = rows.reduce((sum, r) => sum + r.volume, 0);
    baselines.push({
      metricName,
      scope,
      scopeId: scopeId || null,
      baselineValue: avg,
      standardDeviation: sd,
      dataVolume: volume,
      baselineWindowDays: windowDays,
    });
  }

  if (baselines.length === 0) return [];

  await prisma.baseline.createMany({
    data: baselines.map((b) => ({
      metricName: b.metricName,
      scope: b.scope,
      scopeId: b.scopeId ?? null,
      baselineValue: b.baselineValue,
      standardDeviation: b.standardDeviation,
      dataVolume: b.dataVolume,
      baselineWindowDays: b.baselineWindowDays,
      computedAt: new Date(),
    })),
  });

  return baselines;
};
