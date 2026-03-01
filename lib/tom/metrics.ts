import type { Pathway } from "@/lib/pathways/schema";

export type MetricScope = "system" | "specialty" | "consultant";

export type MetricPointInput = {
  metricName: string;
  scope: MetricScope;
  scopeId?: string | null;
  value: number;
  volume: number;
  windowDays: number;
  source: string;
};

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, val) => sum + val, 0) / values.length;

const percent = (num: number, denom: number) => (denom === 0 ? 0 : num / denom);

export const buildSystemMetrics = (pathways: Pathway[], windowDays = 7): MetricPointInput[] => {
  const total = pathways.length;
  if (total === 0) return [];
  const breaching = pathways.filter((p) => p.rtt_status === "breaching").length;
  const atRisk = pathways.filter((p) => p.rtt_status === "at_risk").length;
  const diagnosticsDelay = pathways.filter((p) => p.stage === "diagnostics").length;
  const schedulingDelay = pathways.filter((p) => p.decision_to_treat_date && !p.scheduled_date).length;
  const dna = pathways.filter((p) => p.dna_count > 0).length;
  const validationBacklog = pathways.filter((p) => p.validation_status !== "validated").length;

  return [
    {
      metricName: "breach_rate",
      scope: "system",
      value: percent(breaching, total),
      volume: total,
      windowDays,
      source: "EPR/PTL",
    },
    {
      metricName: "at_risk_rate",
      scope: "system",
      value: percent(atRisk, total),
      volume: total,
      windowDays,
      source: "EPR/PTL",
    },
    {
      metricName: "average_wait",
      scope: "system",
      value: average(pathways.map((p) => p.waiting_days)),
      volume: total,
      windowDays,
      source: "EPR/PTL",
    },
    {
      metricName: "diagnostic_delay_rate",
      scope: "system",
      value: percent(diagnosticsDelay, total),
      volume: total,
      windowDays,
      source: "EPR/PTL",
    },
    {
      metricName: "scheduling_delay_rate",
      scope: "system",
      value: percent(schedulingDelay, total),
      volume: total,
      windowDays,
      source: "EPR/PTL",
    },
    {
      metricName: "dna_rate",
      scope: "system",
      value: percent(dna, total),
      volume: total,
      windowDays,
      source: "EPR/PTL",
    },
    {
      metricName: "validation_backlog_rate",
      scope: "system",
      value: percent(validationBacklog, total),
      volume: total,
      windowDays,
      source: "EPR/PTL",
    },
  ];
};

export const buildConsultantMetrics = (pathways: Pathway[], windowDays = 7): MetricPointInput[] => {
  const byConsultant = new Map<string, Pathway[]>();
  pathways.forEach((p) => {
    if (!byConsultant.has(p.consultant)) byConsultant.set(p.consultant, []);
    byConsultant.get(p.consultant)?.push(p);
  });

  const metrics: MetricPointInput[] = [];
  byConsultant.forEach((items, consultant) => {
    const total = items.length;
    const triage = items.filter((p) => p.stage === "triage");
    metrics.push(
      {
        metricName: "consultant_avg_wait",
        scope: "consultant",
        scopeId: consultant,
        value: average(items.map((p) => p.waiting_days)),
        volume: total,
        windowDays,
        source: "EPR/PTL",
      },
      {
        metricName: "consultant_triage_wait",
        scope: "consultant",
        scopeId: consultant,
        value: average(triage.map((p) => p.waiting_days)),
        volume: triage.length,
        windowDays,
        source: "EPR/PTL",
      },
      {
        metricName: "consultant_case_load",
        scope: "consultant",
        scopeId: consultant,
        value: total,
        volume: total,
        windowDays,
        source: "EPR/PTL",
      },
    );
  });

  return metrics;
};

export const buildMetricsFromPathways = (pathways: Pathway[], windowDays = 7) => {
  return [...buildSystemMetrics(pathways, windowDays), ...buildConsultantMetrics(pathways, windowDays)];
};
