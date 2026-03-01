import type { Pathway } from "@/lib/pathways/schema";
import { computePtlMetrics } from "@/lib/pathways/metrics";
import type { TomAlert } from "@/lib/tom/alerts";

export type CapabilityStatus = {
  epr: boolean;
  roster: boolean;
  inventory: boolean;
  opcs: boolean;
};

export type PtlSummary = {
  counts: Record<string, number>;
  blockers: { awaiting_scheduling: number; awaiting_diagnostics: number; stagnant: number; no_owner: number };
  topRisks: Array<{ patient_id: string; patient_name: string; specialty: string; waiting_days: number }>;
  longestWaiters: Array<{ patient_id: string; patient_name: string; specialty: string; waiting_days: number }>;
};

export type AlertsSummary = {
  counts: number;
  items: Array<{ title: string; detail: string; severity: string }>;
};

export type AnomaliesSummary = {
  counts: number;
  items: Array<{ metricName: string; scope: string; explanation: string; severity: string }>;
};

export type DataUsed = {
  label: string;
  value: number | string;
  source: string;
  timeframe?: string;
  filters?: Record<string, string>;
  record_counts?: number;
  ids?: string[];
};

export const computePtlSummary = (pathways: Pathway[]): PtlSummary => {
  const metrics = computePtlMetrics(pathways);
  const counts = Object.fromEntries(metrics.map((m) => [m.key, m.count])) as Record<string, number>;
  const blockers = {
    awaiting_scheduling: counts.awaiting_scheduling ?? 0,
    awaiting_diagnostics: counts.awaiting_diagnostics ?? 0,
    stagnant: counts.stagnant ?? 0,
    no_owner: counts.no_owner ?? 0,
  };
  const sorted = [...pathways].sort((a, b) => b.waiting_days - a.waiting_days);
  const longestWaiters = sorted.slice(0, 5).map((p) => ({
    patient_id: p.patient_id,
    patient_name: p.patient_name,
    specialty: p.specialty,
    waiting_days: p.waiting_days,
  }));
  const topRisks = sorted
    .filter((p) => p.rtt_status === "breaching" || p.rtt_status === "at_risk")
    .slice(0, 5)
    .map((p) => ({
      patient_id: p.patient_id,
      patient_name: p.patient_name,
      specialty: p.specialty,
      waiting_days: p.waiting_days,
    }));

  return { counts, blockers, topRisks, longestWaiters };
};

export const computeAlerts = (alerts: TomAlert[]): AlertsSummary => {
  return {
    counts: alerts.length,
    items: alerts.map((alert) => ({
      title: alert.title,
      detail: alert.detail,
      severity: alert.severity,
    })),
  };
};

export const computeAnomalies = (anomalies: AnomaliesSummary["items"]): AnomaliesSummary => {
  return {
    counts: anomalies.length,
    items: anomalies,
  };
};

export const computeConfidence = (data_used: DataUsed[], intent: string) => {
  const numericCount = data_used.filter((d) => typeof d.value === "number").length;
  const sourceCount = new Set(data_used.map((d) => d.source)).size;
  if (numericCount === 0) {
    return { level: "low" as const, rationale: "No numeric evidence available." };
  }
  if (numericCount >= 3 && sourceCount >= 2) {
    return { level: "high" as const, rationale: "Multiple sources and sufficient volume." };
  }
  if (intent === "smalltalk") {
    return { level: "low" as const, rationale: "No operational data requested." };
  }
  return { level: "medium" as const, rationale: "Some evidence available but limited scope." };
};
