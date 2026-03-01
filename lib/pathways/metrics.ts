import { PATHWAY_THRESHOLDS } from "./constants";
import { FilterContext, MetricCount, MetricDefinition, Pathway } from "./schema";

export type PtlMetricKey =
  | "in_pool"
  | "urgent"
  | "breaching"
  | "at_risk"
  | "on_track"
  | "awaiting_scheduling"
  | "awaiting_diagnostics"
  | "stagnant"
  | "no_owner";

export const PTL_METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: "in_pool",
    label: "In Pool",
    category: "demand",
    definition: "No scheduled_date set",
  },
  {
    key: "urgent",
    label: "Urgent",
    category: "demand",
    definition: "priority = urgent",
  },
  {
    key: "breaching",
    label: "Breaching",
    category: "risk",
    definition: "rtt_status = breaching",
  },
  {
    key: "at_risk",
    label: "At Risk",
    category: "risk",
    definition: "rtt_status = at_risk",
  },
  {
    key: "on_track",
    label: "On Track",
    category: "risk",
    definition: "rtt_status = on_track",
  },
  {
    key: "awaiting_scheduling",
    label: "Awaiting Scheduling",
    category: "flow",
    definition: "decision_to_treat_date set AND scheduled_date missing",
  },
  {
    key: "awaiting_diagnostics",
    label: "Awaiting Diagnostics",
    category: "flow",
    definition: "stage = diagnostics",
  },
  {
    key: "stagnant",
    label: "Stagnant",
    category: "flow",
    definition: `No activity > ${PATHWAY_THRESHOLDS.STAGNANT_DAYS} days`,
  },
  {
    key: "no_owner",
    label: "No Owner",
    category: "data_quality",
    definition: "owner_id missing",
  },
];

export const applyFilterContext = (
  pathways: Pathway[],
  context: FilterContext,
): Pathway[] => {
  return pathways.filter((pathway) => {
    if (context.specialty && pathway.specialty !== context.specialty) return false;
    if (context.consultant && pathway.consultant !== context.consultant) return false;
    if (context.site && pathway.site !== context.site) return false;
    if (context.rtt_status && pathway.rtt_status !== context.rtt_status) return false;
    if (context.stage && pathway.stage !== context.stage) return false;
    if (context.priority && pathway.priority !== context.priority) return false;
    if (context.owner_id && pathway.owner_id !== context.owner_id) return false;
    if (context.search) {
      const q = context.search.toLowerCase();
      const haystack = `${pathway.patient_name} ${pathway.patient_id} ${pathway.pathway_id} ${pathway.procedure ?? ""}`
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (context.date_from && pathway.last_activity_date < context.date_from) return false;
    if (context.date_to && pathway.last_activity_date > context.date_to) return false;
    return true;
  });
};

const daysSince = (dateString: string, today = new Date()) => {
  const date = new Date(dateString);
  const diff = today.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const filterByMetric = (pathways: Pathway[], metric: PtlMetricKey): Pathway[] => {
  switch (metric) {
    case "in_pool":
      return pathways.filter((p) => !p.scheduled_date);
    case "urgent":
      return pathways.filter((p) => p.priority === "urgent");
    case "breaching":
      return pathways.filter((p) => p.rtt_status === "breaching");
    case "at_risk":
      return pathways.filter((p) => p.rtt_status === "at_risk");
    case "on_track":
      return pathways.filter((p) => p.rtt_status === "on_track");
    case "awaiting_scheduling":
      return pathways.filter((p) => p.decision_to_treat_date && !p.scheduled_date);
    case "awaiting_diagnostics":
      return pathways.filter((p) => p.stage === "diagnostics");
    case "stagnant":
      return pathways.filter(
        (p) => daysSince(p.last_activity_date) > PATHWAY_THRESHOLDS.STAGNANT_DAYS,
      );
    case "no_owner":
      return pathways.filter((p) => !p.owner_id);
    default:
      return pathways;
  }
};

export const computePtlMetrics = (
  pathways: Pathway[],
): MetricCount[] => {
  const metricKeys: PtlMetricKey[] = [
    "in_pool",
    "urgent",
    "breaching",
    "at_risk",
    "on_track",
    "awaiting_scheduling",
    "awaiting_diagnostics",
    "stagnant",
    "no_owner",
  ];

  return metricKeys.map((key) => ({
    key,
    count: filterByMetric(pathways, key).length,
  }));
};
