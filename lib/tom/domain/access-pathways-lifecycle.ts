export type LifecycleStage =
  | "referral"
  | "triage"
  | "waiting"
  | "pathway_progress"
  | "operational_tracking"
  | "compliance"
  | "cancer_compliance"
  | "breach_accountability"
  | "clock_audit"
  | "data_governance";

const LIFECYCLE_STAGE_BY_VIEW_ID: Record<string, LifecycleStage> = {
  "operations.referral_management": "referral",
  "operations.referrals": "referral",
  "operations.triage_status": "triage",
  "operations.triage": "triage",
  "operations.access_pathways_waiting_list": "waiting",
  "operations.waiting_list": "waiting",
  "operations.waiting_list_management": "waiting",
  "operations.waiting": "waiting",
  "operations.pathway_milestones": "pathway_progress",
  "operations.milestones": "pathway_progress",
  "operations.ptl": "operational_tracking",
  "operations.access_pathways_rtt_monitoring": "compliance",
  "operations.rtt_monitoring": "compliance",
  "operations.rtt": "compliance",
  "operations.cancer_2ww": "cancer_compliance",
  "operations.cancer": "cancer_compliance",
  "operations.breach_tracking": "breach_accountability",
  "operations.breach": "breach_accountability",
  "operations.clock_starts_stops": "clock_audit",
  "operations.clock": "clock_audit",
  "operations.validation_data_quality": "data_governance",
  "operations.validation": "data_governance",
};

export const resolveLifecycleStage = (view_id: string): LifecycleStage => {
  const key = String(view_id || "").trim();
  return LIFECYCLE_STAGE_BY_VIEW_ID[key] ?? "operational_tracking";
};
