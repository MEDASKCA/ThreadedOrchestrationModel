export type PTLRow = {
  patient_name: string;
  nhs_number: string;
  age: number;
  priority: "urgent" | "routine" | "expedited";
  procedure?: string;
  consultant?: string;
  specialty: string;
  duration_minutes?: number;
  waiting_days: number;
  rtt_target_weeks: number;
  rtt_status: "on_track" | "at_risk" | "breaching";
};

export type PTLPage = {
  rows: PTLRow[];
  summary_tiles?: Record<string, number>;
};
