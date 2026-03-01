import { MetricDefinition } from "./schema";

export type MetricCategory =
  | "demand"
  | "risk"
  | "flow"
  | "capacity"
  | "performance"
  | "compliance"
  | "quality"
  | "safety";

export const buildMetricDefs = (
  metrics: Array<{ key: string; label: string; definition: string; category: MetricCategory }>,
): MetricDefinition[] => metrics;

export const WAITING_LIST_METRICS = buildMetricDefs([
  {
    key: "total_waiting",
    label: "Total waiting list",
    definition: "Count by specialty",
    category: "demand",
  },
  {
    key: "avg_wait",
    label: "Average waiting time",
    definition: "Mean waiting days by specialty",
    category: "performance",
  },
  {
    key: "slot_util",
    label: "Slot utilization",
    definition: "Booked slots / available slots",
    category: "capacity",
  },
  {
    key: "dtt_to_booking",
    label: "Decision-to-treat to booking",
    definition: "Average days between DTT and booking",
    category: "flow",
  },
  {
    key: "theatre_backlog",
    label: "Theatre backlog vs sessions",
    definition: "Backlog count compared to planned sessions",
    category: "capacity",
  },
  {
    key: "capacity_gap",
    label: "Capacity gap forecast",
    definition: "Projected demand minus capacity (4-8 weeks)",
    category: "capacity",
  },
]);

export const RTT_METRICS = buildMetricDefs([
  {
    key: "within_18_weeks",
    label: "% within 18 weeks",
    definition: "Percent pathways within 18 weeks",
    category: "compliance",
  },
  {
    key: "breach_52",
    label: "52-week breaches",
    definition: "Count of 52-week breaches",
    category: "compliance",
  },
  {
    key: "avg_wait",
    label: "Average wait",
    definition: "Mean waiting days",
    category: "performance",
  },
  {
    key: "median_wait",
    label: "Median wait",
    definition: "Median waiting days",
    category: "performance",
  },
  {
    key: "trend_12w",
    label: "Trend (12 weeks)",
    definition: "Weekly trend of RTT performance",
    category: "performance",
  },
  {
    key: "forecast_breaches",
    label: "Forecast breaches",
    definition: "Projected breaches over next 8 weeks",
    category: "risk",
  },
]);

export const CANCER_METRICS = buildMetricDefs([
  {
    key: "active_2ww",
    label: "2WW referrals active",
    definition: "Active 2WW pathways",
    category: "demand",
  },
  {
    key: "compliance_62d",
    label: "62-day compliance",
    definition: "% within 62 days",
    category: "compliance",
  },
  {
    key: "breaches_by_site",
    label: "Breaches by tumor site",
    definition: "Breaches grouped by tumor site",
    category: "risk",
  },
  {
    key: "urgent_dx_pending",
    label: "Urgent diagnostics pending",
    definition: "Pending urgent diagnostics",
    category: "flow",
  },
  {
    key: "safety_escalations",
    label: "Safety escalations",
    definition: "Active escalations",
    category: "safety",
  },
]);

export const REFERRAL_METRICS = buildMetricDefs([
  {
    key: "new_referrals",
    label: "New referrals",
    definition: "New referrals (today/weekly)",
    category: "demand",
  },
  {
    key: "awaiting_triage",
    label: "Awaiting triage",
    definition: "Referrals not yet triaged",
    category: "flow",
  },
  {
    key: "overdue_triage",
    label: "Overdue triage",
    definition: "Referrals exceeding triage SLA",
    category: "risk",
  },
  {
    key: "rejected",
    label: "Rejected referrals",
    definition: "Rejected referrals count",
    category: "quality",
  },
  {
    key: "conversion_rate",
    label: "Conversion rate",
    definition: "Referrals converted to treatment pathway",
    category: "performance",
  },
]);

export const TRIAGE_METRICS = buildMetricDefs([
  {
    key: "awaiting_review",
    label: "Awaiting consultant review",
    definition: "Awaiting clinician decision",
    category: "flow",
  },
  {
    key: "overdue_triage",
    label: "Overdue triage",
    definition: "Triage pending > SLA",
    category: "risk",
  },
  {
    key: "clarification",
    label: "Clarification requested",
    definition: "Awaiting additional info",
    category: "flow",
  },
  {
    key: "reprioritization",
    label: "Reprioritization pending",
    definition: "Cases pending priority change",
    category: "risk",
  },
]);

export const BREACH_METRICS = buildMetricDefs([
  {
    key: "breaches_by_specialty",
    label: "Breaches by specialty",
    definition: "Breaches grouped by specialty",
    category: "risk",
  },
  {
    key: "breaches_by_cause",
    label: "Breaches by cause",
    definition: "Root cause counts",
    category: "risk",
  },
  {
    key: "repeat_breaches",
    label: "Repeat breach cases",
    definition: "Pathways with >1 breach",
    category: "risk",
  },
  {
    key: "trend_weekly",
    label: "Weekly trend",
    definition: "Weekly breach trend",
    category: "performance",
  },
]);

export const MILESTONE_METRICS = buildMetricDefs([
  {
    key: "stage_distribution",
    label: "Stage distribution",
    definition: "% in each pathway stage",
    category: "flow",
  },
  {
    key: "avg_stage_gap",
    label: "Average days between stages",
    definition: "Mean days between standardized stages",
    category: "performance",
  },
  {
    key: "bottlenecks",
    label: "Bottleneck heatmap",
    definition: "Stages with highest aging",
    category: "risk",
  },
]);

export const CLOCK_METRICS = buildMetricDefs([
  {
    key: "clock_start_anomalies",
    label: "Clock start anomalies",
    definition: "Invalid or missing start events",
    category: "compliance",
  },
  {
    key: "suspended_clocks",
    label: "Suspended clocks",
    definition: "Active suspended clocks",
    category: "compliance",
  },
  {
    key: "stop_without_proc",
    label: "Stop without procedure",
    definition: "Clock stop with no procedure",
    category: "quality",
  },
  {
    key: "duplicate_clocks",
    label: "Duplicate clocks",
    definition: "Multiple clock records",
    category: "quality",
  },
  {
    key: "manual_overrides",
    label: "Manual overrides",
    definition: "Manual date change events",
    category: "compliance",
  },
]);

export const VALIDATION_METRICS = buildMetricDefs([
  {
    key: "validation_overdue",
    label: "Validation overdue",
    definition: "Last validated beyond threshold",
    category: "quality",
  },
  {
    key: "never_validated",
    label: "Never validated",
    definition: "Validation status = never_validated",
    category: "quality",
  },
  {
    key: "dna_no_rebook",
    label: "DNA without rebook",
    definition: "DNA recorded with no rebook",
    category: "risk",
  },
  {
    key: "no_owner",
    label: "No owner assigned",
    definition: "owner_id missing",
    category: "quality",
  },
  {
    key: "duplicate_nhs",
    label: "Duplicate NHS numbers",
    definition: "Potential duplicate patient IDs",
    category: "quality",
  },
  {
    key: "missing_fields",
    label: "Missing mandatory fields",
    definition: "Incomplete pathway records",
    category: "quality",
  },
  {
    key: "no_contact",
    label: "No recent contact",
    definition: "No patient contact logged within threshold",
    category: "risk",
  },
  {
    key: "ghost_pathways",
    label: "Ghost pathways",
    definition: "No activity + high waiting days",
    category: "risk",
  },
]);
