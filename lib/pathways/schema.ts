export const PATHWAY_STAGES = [
  "referral",
  "triage",
  "diagnostics",
  "decision",
  "scheduled",
  "completed",
] as const;

export const RTT_STATUSES = [
  "on_track",
  "at_risk",
  "breaching",
  "within_52_week",
] as const;

export const PRIORITIES = ["urgent", "soon", "routine", "unknown"] as const;

export const VALIDATION_STATUSES = [
  "validated",
  "required",
  "overdue",
  "never_validated",
] as const;

export const CLOCK_STATUSES = ["running", "stopped", "suspended"] as const;

export type PathwayStage = (typeof PATHWAY_STAGES)[number];
export type RttStatus = (typeof RTT_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];
export type ClockStatus = (typeof CLOCK_STATUSES)[number];

export type Pathway = {
  pathway_id: string;
  patient_id: string;
  patient_name: string;
  patient_age?: number;
  specialty: string;
  consultant: string;
  site: string;
  priority: Priority;
  stage: PathwayStage;
  rtt_status: RttStatus;
  waiting_days: number;
  last_activity_date: string;
  owner_id?: string | null;
  validation_status: ValidationStatus;
  dna_count: number;
  clock_status: ClockStatus;
  breach_flag: boolean;
  breach_root_cause?: string | null;
  decision_to_treat_date?: string | null;
  scheduled_date?: string | null;
  procedure?: string | null;
  opcs_code?: string | null;
  duration?: string | null;
  rtt_target?: string | null;
};

export type FilterContext = {
  specialty?: string;
  consultant?: string;
  site?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  rtt_status?: RttStatus;
  stage?: PathwayStage;
  priority?: Priority;
  owner_id?: string;
};

export type MetricDefinition = {
  key: string;
  label: string;
  category:
    | "demand"
    | "risk"
    | "flow"
    | "data_quality"
    | "capacity"
    | "performance"
    | "compliance"
    | "quality"
    | "safety";
  definition: string;
};

export type MetricCount = {
  key: string;
  count: number;
};
