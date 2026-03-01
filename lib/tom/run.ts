import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import { buildMetricsFromPathways } from "@/lib/tom/metrics";
import { storeMetricPoints, computeBaselines } from "@/lib/tom/baselines";
import { detectAnomalies } from "@/lib/tom/anomalies";
import { dispatchAlerts } from "@/lib/tom/dispatch";

export const runMetricsCollection = async (windowDays = 7) => {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const pathways = await connectorRegistry.epr.getPathways();
  const metrics = buildMetricsFromPathways(pathways, windowDays);
  await storeMetricPoints(metrics);
  return { metrics, pathwaysCount: pathways.length };
};

export const runBaselineRefresh = async (baselineWindowDays = 84) => {
  const baselines = await computeBaselines(baselineWindowDays);
  return { baselines };
};

export const runAnomalyDetection = async (windowDays = 7, baselineWindowDays = 84) => {
  const { metrics } = await runMetricsCollection(windowDays);
  const baselines = await computeBaselines(baselineWindowDays);
  const anomalies = await detectAnomalies(metrics, windowDays);
  const dispatches = await dispatchAlerts(
    anomalies.map((a) => ({
      id: a.id,
      severity: a.severity,
      metricName: a.metricName,
      scope: a.scope,
      scopeId: a.scopeId,
      explanation: a.explanation,
      transparencyPayload: a.transparencyPayload,
    })),
  );
  return { metrics, baselines, anomalies, dispatches };
};
