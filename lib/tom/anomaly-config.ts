export const ANOMALY_THRESHOLDS = {
  minVolume: 5,
  percentChange: 0.25,
  zScore: 2.0,
  consecutivePeriods: 1,
  severityEscalation: 0.5,
};

export const METRIC_SEVERITY: Record<string, "low" | "medium" | "high"> = {
  breach_rate: "high",
  diagnostic_delay_rate: "high",
  scheduling_delay_rate: "high",
  at_risk_rate: "medium",
  average_wait: "medium",
  dna_rate: "medium",
  validation_backlog_rate: "medium",
  consultant_avg_wait: "medium",
  consultant_triage_wait: "medium",
  consultant_case_load: "low",
};
