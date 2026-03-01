import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import { computePtlSummary } from "@/lib/tom/reasoning/engine";
import type { Pathway } from "@/lib/pathways/schema";
import type { ToolResult } from "./types";

export type PtlSummaryOutput = {
  counts: Record<string, number>;
  longestWaiters: Array<{ patient_id: string; patient_name: string; specialty: string; waiting_days: number }>;
  topRisks: Array<{ patient_id: string; patient_name: string; specialty: string; waiting_days: number }>;
};

export const getPtlPathways = async (): Promise<ToolResult<Pathway[]>> => {
  try {
    if (!connectorRegistry.isInitialized) {
      await initializeIntegrations();
    }
    const data = await connectorRegistry.epr.getPathways();
    return { ok: true, data, source: "EPR/PTL" };
  } catch (error) {
    return { ok: false, error: "EPR connector unavailable", source: "EPR/PTL" };
  }
};

export const getPtlSummary = async (): Promise<ToolResult<PtlSummaryOutput>> => {
  const pathwaysResult = await getPtlPathways();
  if (!pathwaysResult.ok || !pathwaysResult.data) return { ok: false, error: pathwaysResult.error, source: "EPR/PTL" };
  const summary = computePtlSummary(pathwaysResult.data);
  return {
    ok: true,
    data: {
      counts: summary.counts,
      longestWaiters: summary.longestWaiters,
      topRisks: summary.topRisks,
    },
    source: "EPR/PTL",
  };
};
