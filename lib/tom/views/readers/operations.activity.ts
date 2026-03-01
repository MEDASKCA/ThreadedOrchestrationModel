import { buildViewEvidence } from "./evidence";

// ─── read_daily_activity_vs_plan ──────────────────────────────────────────────

export async function read_daily_activity_vs_plan(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    specialty: string;
    planned_procedures: number;
    actual_procedures: number;
    variance: number;
    variance_pct: number;
    status: "On Plan" | "Under" | "Over";
  }> = [
    { specialty: "General Surgery", planned_procedures: 18, actual_procedures: 17, variance: -1, variance_pct: -5.6,  status: "Under"   },
    { specialty: "Orthopaedics",    planned_procedures: 14, actual_procedures: 12, variance: -2, variance_pct: -14.3, status: "Under"   },
    { specialty: "Cardiothoracic",  planned_procedures:  6, actual_procedures:  6, variance:  0, variance_pct:  0.0,  status: "On Plan" },
    { specialty: "ENT",             planned_procedures: 20, actual_procedures: 21, variance:  1, variance_pct:  5.0,  status: "Over"    },
    { specialty: "Gynaecology",     planned_procedures: 16, actual_procedures: 16, variance:  0, variance_pct:  0.0,  status: "On Plan" },
    { specialty: "Respiratory",     planned_procedures:  8, actual_procedures:  6, variance: -2, variance_pct: -25.0, status: "Under"   },
    { specialty: "Oncology",        planned_procedures: 10, actual_procedures: 10, variance:  0, variance_pct:  0.0,  status: "On Plan" },
  ];

  const total_planned  = rows.reduce((s, r) => s + r.planned_procedures,  0);
  const total_actual   = rows.reduce((s, r) => s + r.actual_procedures,   0);
  const overall_variance = total_actual - total_planned;
  const on_plan_count  = rows.filter(r => r.status === "On Plan").length;
  const under_count    = rows.filter(r => r.status === "Under").length;
  const over_count     = rows.filter(r => r.status === "Over").length;

  const metrics = {
    total_planned,
    total_actual,
    overall_variance,
    on_plan_count,
    under_count,
    over_count,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.dailyVsPlan",
        filters: params.filters,
        records: rows,
        label: "Daily Activity vs Plan",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_theatre_utilisation ─────────────────────────────────────────────────

export async function read_theatre_utilisation(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { theatre_id: "TH01", specialty: "General Surgery", date: "2026-02-26", scheduled_mins: 480, used_mins: 456, overrun_mins:  5, utilisation_pct: 95.0, cases_planned: 4, cases_completed: 4 },
    { theatre_id: "TH02", specialty: "Orthopaedics",    date: "2026-02-26", scheduled_mins: 480, used_mins: 374, overrun_mins:  0, utilisation_pct: 77.9, cases_planned: 3, cases_completed: 2 },
    { theatre_id: "TH03", specialty: "Cardiothoracic",  date: "2026-02-26", scheduled_mins: 360, used_mins: 360, overrun_mins: 20, utilisation_pct: 100.0,cases_planned: 2, cases_completed: 2 },
    { theatre_id: "TH04", specialty: "ENT",             date: "2026-02-26", scheduled_mins: 480, used_mins: 422, overrun_mins:  0, utilisation_pct: 87.9, cases_planned: 5, cases_completed: 5 },
    { theatre_id: "TH05", specialty: "Gynaecology",     date: "2026-02-26", scheduled_mins: 480, used_mins: 346, overrun_mins:  0, utilisation_pct: 72.1, cases_planned: 4, cases_completed: 4 },
    { theatre_id: "TH06", specialty: "Emergency",       date: "2026-02-26", scheduled_mins:   0, used_mins:   0, overrun_mins:  0, utilisation_pct:  0.0, cases_planned: 0, cases_completed: 0 },
  ];

  const activeRows = rows.filter(r => r.scheduled_mins > 0);
  const avg_utilisation_pct   = Math.round(
    (activeRows.reduce((s, r) => s + r.utilisation_pct, 0) / activeRows.length) * 10
  ) / 10;
  const total_overrun_mins     = rows.reduce((s, r) => s + r.overrun_mins,    0);
  const fully_utilised_theatres= rows.filter(r => r.utilisation_pct >= 90).length;
  const underutilised_theatres = rows.filter(r => r.scheduled_mins > 0 && r.utilisation_pct < 80).length;

  const metrics = {
    avg_utilisation_pct,
    total_overrun_mins,
    fully_utilised_theatres,
    underutilised_theatres,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.theatreUtil",
        filters: params.filters,
        records: rows,
        label: "Theatre Utilisation",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_clinic_utilisation ──────────────────────────────────────────────────

export async function read_clinic_utilisation(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { clinic: "Cardiology AM Clinic",  specialty: "Cardiology",      slots_available: 20, slots_used: 16, dna_count: 2, cancellation_count: 0, utilisation_pct: 90.0, effective_utilisation_pct: 80.0 },
    { clinic: "General Surgery Clinic",specialty: "General Surgery",  slots_available: 16, slots_used: 13, dna_count: 1, cancellation_count: 1, utilisation_pct: 87.5, effective_utilisation_pct: 81.3 },
    { clinic: "Orthopaedics Clinic",   specialty: "Orthopaedics",    slots_available: 24, slots_used: 18, dna_count: 3, cancellation_count: 1, utilisation_pct: 91.7, effective_utilisation_pct: 75.0 },
    { clinic: "Respiratory Clinic",    specialty: "Respiratory",     slots_available: 18, slots_used: 13, dna_count: 2, cancellation_count: 0, utilisation_pct: 83.3, effective_utilisation_pct: 72.2 },
    { clinic: "Oncology Clinic",       specialty: "Oncology",        slots_available: 12, slots_used: 11, dna_count: 1, cancellation_count: 0, utilisation_pct: 100.0,effective_utilisation_pct: 91.7 },
    { clinic: "Neurology Clinic",      specialty: "Neurology",       slots_available: 10, slots_used:  6, dna_count: 1, cancellation_count: 0, utilisation_pct: 70.0, effective_utilisation_pct: 60.0 },
  ];

  const avg_utilisation_pct = Math.round(
    (rows.reduce((s, r) => s + r.utilisation_pct, 0) / rows.length) * 10
  ) / 10;
  const avg_effective_utilisation_pct = Math.round(
    (rows.reduce((s, r) => s + r.effective_utilisation_pct, 0) / rows.length) * 10
  ) / 10;
  const total_dna_today     = rows.reduce((s, r) => s + r.dna_count, 0);
  const highestDnaRow       = rows.reduce((a, b) => b.dna_count > a.dna_count ? b : a);
  const highest_dna_clinic  = highestDnaRow.clinic;

  const metrics = {
    avg_utilisation_pct,
    avg_effective_utilisation_pct,
    highest_dna_clinic,
    total_dna_today,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.clinicUtil",
        filters: params.filters,
        records: rows,
        label: "Clinic Utilisation",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_dna_rates ───────────────────────────────────────────────────────────

export async function read_dna_rates(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    specialty: string;
    month: string;
    appointments: number;
    dna_count: number;
    dna_rate_pct: number;
    prev_month_rate_pct: number;
    trend: "Improving" | "Stable" | "Worsening";
  }> = [
    { specialty: "Orthopaedics",   month: "Feb 2026", appointments: 212, dna_count: 30, dna_rate_pct: 14.2, prev_month_rate_pct: 13.1, trend: "Worsening" },
    { specialty: "General Surgery",month: "Feb 2026", appointments: 186, dna_count: 20, dna_rate_pct: 10.8, prev_month_rate_pct: 11.4, trend: "Improving" },
    { specialty: "Respiratory",    month: "Feb 2026", appointments: 154, dna_count: 17, dna_rate_pct: 11.0, prev_month_rate_pct: 11.0, trend: "Stable"    },
    { specialty: "Neurology",      month: "Feb 2026", appointments: 98,  dna_count: 11, dna_rate_pct: 11.2, prev_month_rate_pct: 12.6, trend: "Improving" },
    { specialty: "Gynaecology",    month: "Feb 2026", appointments: 134, dna_count: 11, dna_rate_pct:  8.2, prev_month_rate_pct:  7.9, trend: "Worsening" },
    { specialty: "Oncology",       month: "Feb 2026", appointments: 110, dna_count:  7, dna_rate_pct:  6.4, prev_month_rate_pct:  6.6, trend: "Improving" },
    { specialty: "Cardiology",     month: "Feb 2026", appointments: 176, dna_count:  9, dna_rate_pct:  5.1, prev_month_rate_pct:  5.3, trend: "Improving" },
  ];

  const total_appointments      = rows.reduce((s, r) => s + r.appointments, 0);
  const total_dna               = rows.reduce((s, r) => s + r.dna_count,    0);
  const overall_dna_rate_pct    = Math.round((total_dna / total_appointments) * 1000) / 10;
  const appointments_lost_to_dna= total_dna;
  const highestRow              = rows.reduce((a, b) => b.dna_rate_pct > a.dna_rate_pct ? b : a);
  const lowestRow               = rows.reduce((a, b) => b.dna_rate_pct < a.dna_rate_pct ? b : a);

  const metrics = {
    overall_dna_rate_pct,
    highest_dna_specialty: highestRow.specialty,
    lowest_dna_specialty: lowestRow.specialty,
    appointments_lost_to_dna,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.dna",
        filters: params.filters,
        records: rows,
        label: "DNA Rates",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_cancellation_rates ──────────────────────────────────────────────────

export async function read_cancellation_rates(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    reason: string;
    count: number;
    pct_of_total: number;
    category: "Patient" | "Clinical" | "Operational";
    trend: "Up" | "Down" | "Stable";
  }> = [
    { reason: "Patient Request",        count: 38, pct_of_total: 28.1, category: "Patient",     trend: "Stable" },
    { reason: "Clinical Decision",      count: 24, pct_of_total: 17.8, category: "Clinical",    trend: "Down"   },
    { reason: "Theatre Unavailable",    count: 19, pct_of_total: 14.1, category: "Operational", trend: "Up"     },
    { reason: "Equipment Failure",      count:  8, pct_of_total:  5.9, category: "Operational", trend: "Stable" },
    { reason: "Staff Absence",          count: 14, pct_of_total: 10.4, category: "Operational", trend: "Up"     },
    { reason: "Short-Notice DNA",       count: 21, pct_of_total: 15.6, category: "Patient",     trend: "Up"     },
    { reason: "Bed Unavailability",     count: 11, pct_of_total:  8.1, category: "Operational", trend: "Stable" },
  ];

  const total_cancellations_mtd = rows.reduce((s, r) => s + r.count, 0);
  // Assume approx 1,400 procedures MTD for rate calculation
  const cancellation_rate_pct   = Math.round((total_cancellations_mtd / 1400) * 1000) / 10;
  const patient_total           = rows.filter(r => r.category === "Patient").reduce((s, r) => s + r.count, 0);
  const operational_total       = rows.filter(r => r.category === "Operational").reduce((s, r) => s + r.count, 0);
  const clinical_total          = rows.filter(r => r.category === "Clinical").reduce((s, r) => s + r.count, 0);
  const patient_initiated_pct   = Math.round((patient_total    / total_cancellations_mtd) * 1000) / 10;
  const operational_pct         = Math.round((operational_total / total_cancellations_mtd) * 1000) / 10;
  const clinical_pct            = Math.round((clinical_total   / total_cancellations_mtd) * 1000) / 10;

  const metrics = {
    total_cancellations_mtd,
    cancellation_rate_pct,
    patient_initiated_pct,
    operational_pct,
    clinical_pct,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.cancellations",
        filters: params.filters,
        records: rows,
        label: "Cancellation Rates",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_breach_performance ──────────────────────────────────────────────────

export async function read_breach_performance(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    specialty: string;
    breaches_mtd: number;
    breaches_ytd: number;
    breach_rate_pct: number;
    target_breach_rate_pct: number;
    rag_status: "green" | "amber" | "red";
  }> = [
    { specialty: "Orthopaedics",   breaches_mtd: 9,  breaches_ytd: 47, breach_rate_pct: 8.6,  target_breach_rate_pct: 5, rag_status: "red"   },
    { specialty: "General Surgery",breaches_mtd: 6,  breaches_ytd: 31, breach_rate_pct: 6.2,  target_breach_rate_pct: 5, rag_status: "amber" },
    { specialty: "Respiratory",    breaches_mtd: 4,  breaches_ytd: 19, breach_rate_pct: 5.7,  target_breach_rate_pct: 5, rag_status: "amber" },
    { specialty: "Cardiology",     breaches_mtd: 2,  breaches_ytd: 11, breach_rate_pct: 3.8,  target_breach_rate_pct: 5, rag_status: "green" },
    { specialty: "ENT",            breaches_mtd: 1,  breaches_ytd:  5, breach_rate_pct: 2.3,  target_breach_rate_pct: 5, rag_status: "green" },
    { specialty: "Gynaecology",    breaches_mtd: 1,  breaches_ytd:  6, breach_rate_pct: 2.7,  target_breach_rate_pct: 5, rag_status: "green" },
    { specialty: "Oncology",       breaches_mtd: 0,  breaches_ytd:  2, breach_rate_pct: 0.0,  target_breach_rate_pct: 5, rag_status: "green" },
  ];

  const total_breaches_mtd           = rows.reduce((s, r) => s + r.breaches_mtd, 0);
  const total_breaches_ytd           = rows.reduce((s, r) => s + r.breaches_ytd, 0);
  const specialties_breaching_target = rows.filter(r => r.breach_rate_pct > r.target_breach_rate_pct).length;
  const worstRow                     = rows.reduce((a, b) => b.breach_rate_pct > a.breach_rate_pct ? b : a);

  const metrics = {
    total_breaches_mtd,
    total_breaches_ytd,
    specialties_breaching_target,
    worst_performing_specialty: worstRow.specialty,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.breachPerf",
        filters: params.filters,
        records: rows,
        label: "Breach Performance",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_performance_vs_targets ─────────────────────────────────────────────

export async function read_performance_vs_targets(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    kpi: string;
    target: string;
    actual: string;
    status: "green" | "amber" | "red";
    trend: "Improving" | "Stable" | "Worsening";
    owner: string;
  }> = [
    { kpi: "RTT 18-Week Compliance",          target: "92%",    actual: "87.3%", status: "red",   trend: "Improving", owner: "Elective Access Team"     },
    { kpi: "Cancer 62-Day Pathway",           target: "85%",    actual: "81.2%", status: "red",   trend: "Worsening", owner: "Oncology"                 },
    { kpi: "Cancer 2-Week Wait",              target: "93%",    actual: "94.1%", status: "green", trend: "Stable",    owner: "Rapid Diagnostic Service" },
    { kpi: "Theatre Utilisation",             target: "85%",    actual: "83.7%", status: "amber", trend: "Improving", owner: "Theatres Manager"         },
    { kpi: "DNA Rate",                        target: "<10%",   actual: "9.8%",  status: "green", trend: "Improving", owner: "Patient Access"           },
    { kpi: "Bed Occupancy",                   target: "<95%",   actual: "93.2%", status: "green", trend: "Stable",    owner: "Site Management"          },
    { kpi: "Delayed Discharges",              target: "<5%",    actual: "6.1%",  status: "amber", trend: "Worsening", owner: "Discharge Team"           },
    { kpi: "DTOC (Delayed Transfer of Care)", target: "<3.5%",  actual: "3.9%",  status: "amber", trend: "Stable",    owner: "Integrated Care Board"    },
  ];

  const kpis_green = rows.filter(r => r.status === "green").length;
  const kpis_amber = rows.filter(r => r.status === "amber").length;
  const kpis_red   = rows.filter(r => r.status === "red").length;
  const total_kpis = rows.length;

  const metrics = { kpis_green, kpis_amber, kpis_red, total_kpis };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.targets",
        filters: params.filters,
        records: rows,
        label: "Performance vs Targets",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_variance_analysis ───────────────────────────────────────────────────

export async function read_variance_analysis(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    metric: string;
    category: "Capacity" | "Activity" | "Quality";
    plan: number;
    actual: number;
    variance: number;
    variance_pct: number;
    explanation: string;
    rag_status: "green" | "amber" | "red";
  }> = [
    { metric: "Total Procedures",         category: "Activity",  plan: 92,   actual: 88,   variance: -4,   variance_pct: -4.3,  explanation: "2 cancellations respiratory, 2 orthopaedic delayed",            rag_status: "amber" },
    { metric: "Theatre Sessions Run",     category: "Capacity",  plan: 10,   actual: 10,   variance:  0,   variance_pct:  0.0,  explanation: "All sessions ran as planned",                                    rag_status: "green" },
    { metric: "Theatre Utilisation %",    category: "Capacity",  plan: 85,   actual: 83.7, variance: -1.3, variance_pct: -1.5,  explanation: "Slight underperformance in gynaecology and orthopaedics",       rag_status: "amber" },
    { metric: "Clinic Slots Used",        category: "Activity",  plan: 100,  actual: 94,   variance: -6,   variance_pct: -6.0,  explanation: "DNA impact in neurology and orthopaedics",                       rag_status: "amber" },
    { metric: "Inpatient Admissions",     category: "Activity",  plan: 18,   actual: 19,   variance:  1,   variance_pct:  5.6,  explanation: "Emergency overflow from Royal Infirmary OPEL 3",                 rag_status: "green" },
    { metric: "Bed Occupancy %",          category: "Capacity",  plan: 90,   actual: 92.3, variance:  2.3, variance_pct:  2.6,  explanation: "Higher than expected emergency admissions",                      rag_status: "amber" },
    { metric: "Average Length of Stay",   category: "Quality",   plan: 4.2,  actual: 4.7,  variance:  0.5, variance_pct: 11.9,  explanation: "Orthopaedic LOS extended - delayed social care package",         rag_status: "amber" },
    { metric: "Day Case Rate %",          category: "Activity",  plan: 72,   actual: 74,   variance:  2,   variance_pct:  2.8,  explanation: "Good ENT day case conversion",                                   rag_status: "green" },
  ];

  const total_variances_tracked = rows.length;
  const adverse_variances       = rows.filter(r => r.variance < 0 || (r.variance > 0 && ["bed_occupancy_pct", "average_length_of_stay"].includes(r.metric.toLowerCase().replace(/ /g, "_")))).length;
  const favourable_variances    = rows.filter(r => r.rag_status === "green").length;
  const largestAdverseRow       = rows
    .filter(r => r.rag_status !== "green")
    .reduce((a, b) => Math.abs(b.variance_pct) > Math.abs(a.variance_pct) ? b : a, rows[0]);
  const largest_adverse_metric  = largestAdverseRow?.metric ?? "N/A";

  const metrics = {
    total_variances_tracked,
    adverse_variances,
    favourable_variances,
    largest_adverse_metric,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.variance",
        filters: params.filters,
        records: rows,
        label: "Variance Analysis",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_specialty_performance ───────────────────────────────────────────────

export async function read_specialty_performance(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    specialty: string;
    cases_mtd: number;
    target_cases_mtd: number;
    achievement_pct: number;
    breach_count_mtd: number;
    dna_rate_pct: number;
    avg_los_days: number;
    theatre_util_pct: number;
    rag_status: "green" | "amber" | "red";
  }> = [
    { specialty: "General Surgery", cases_mtd: 186, target_cases_mtd: 190, achievement_pct: 97.9, breach_count_mtd: 6,  dna_rate_pct: 10.8, avg_los_days: 3.1, theatre_util_pct: 95.0, rag_status: "amber" },
    { specialty: "Orthopaedics",    cases_mtd: 142, target_cases_mtd: 160, achievement_pct: 88.8, breach_count_mtd: 9,  dna_rate_pct: 14.2, avg_los_days: 5.8, theatre_util_pct: 77.9, rag_status: "red"   },
    { specialty: "Cardiothoracic",  cases_mtd: 48,  target_cases_mtd: 48,  achievement_pct: 100.0,breach_count_mtd: 2,  dna_rate_pct: 4.2,  avg_los_days: 6.4, theatre_util_pct: 100.0,rag_status: "green" },
    { specialty: "ENT",             cases_mtd: 198, target_cases_mtd: 192, achievement_pct: 103.1,breach_count_mtd: 1,  dna_rate_pct: 7.1,  avg_los_days: 0.8, theatre_util_pct: 87.9, rag_status: "green" },
    { specialty: "Gynaecology",     cases_mtd: 131, target_cases_mtd: 140, achievement_pct: 93.6, breach_count_mtd: 1,  dna_rate_pct: 8.2,  avg_los_days: 1.9, theatre_util_pct: 72.1, rag_status: "amber" },
    { specialty: "Respiratory",     cases_mtd:  78, target_cases_mtd:  90, achievement_pct: 86.7, breach_count_mtd: 4,  dna_rate_pct: 11.0, avg_los_days: 4.2, theatre_util_pct: 70.0, rag_status: "red"   },
    { specialty: "Oncology",        cases_mtd: 108, target_cases_mtd: 108, achievement_pct: 100.0,breach_count_mtd: 0,  dna_rate_pct: 6.4,  avg_los_days: 3.7, theatre_util_pct: 88.0, rag_status: "green" },
  ];

  const specialties_on_target = rows.filter(r => r.achievement_pct >= 95).length;
  const specialties_at_risk   = rows.filter(r => r.rag_status === "red" || r.rag_status === "amber").length;
  const bestRow               = rows.reduce((a, b) => b.achievement_pct > a.achievement_pct ? b : a);
  const worstRow              = rows.reduce((a, b) => b.achievement_pct < a.achievement_pct ? b : a);

  const metrics = {
    specialties_on_target,
    specialties_at_risk,
    best_performing: bestRow.specialty,
    worst_performing: worstRow.specialty,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.specialtyPerf",
        filters: params.filters,
        records: rows,
        label: "Specialty Performance",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_solari_board ────────────────────────────────────────────────────────

export async function read_solari_board(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const now = new Date().toISOString();

  const rows: Array<{
    metric: string;
    value: string;
    unit: string;
    rag_status: "green" | "amber" | "red" | "blue";
    updated_at: string;
  }> = [
    { metric: "Bed Occupancy",                  value: "92.3",          unit: "%",                rag_status: "amber", updated_at: now },
    { metric: "ICU Occupancy",                  value: "85.7",          unit: "%",                rag_status: "amber", updated_at: now },
    { metric: "Theatre Utilisation Today",      value: "83.7",          unit: "%",                rag_status: "green", updated_at: now },
    { metric: "OPEL Level",                     value: "2 - Pressured", unit: "level",            rag_status: "amber", updated_at: now },
    { metric: "Active Capacity Alerts",         value: "3",             unit: "alerts",           rag_status: "amber", updated_at: now },
    { metric: "Patients Awaiting Bed",          value: "12",            unit: "patients",         rag_status: "amber", updated_at: now },
    { metric: "Delayed Discharges Today",       value: "8",             unit: "patients",         rag_status: "amber", updated_at: now },
    { metric: "Same-Day Cancellations Today",   value: "2",             unit: "cancellations",    rag_status: "green", updated_at: now },
    { metric: "Total Breaches MTD",             value: "23",            unit: "breaches",         rag_status: "amber", updated_at: now },
    { metric: "RTT 18-Week Compliance",         value: "87.3",          unit: "%",                rag_status: "amber", updated_at: now },
    { metric: "Cancer 62-Day Compliance",       value: "81.2",          unit: "%",                rag_status: "red",   updated_at: now },
    { metric: "Open Escalation Incidents",      value: "1",             unit: "incidents",        rag_status: "amber", updated_at: now },
  ];

  const opel_level_num  = 2;
  const red_kpis        = rows.filter(r => r.rag_status === "red").length;
  const amber_kpis      = rows.filter(r => r.rag_status === "amber").length;
  const green_kpis      = rows.filter(r => r.rag_status === "green").length;
  const alerts_active   = parseInt(rows.find(r => r.metric === "Active Capacity Alerts")?.value ?? "0", 10);

  const metrics = {
    opel_level_num,
    red_kpis,
    amber_kpis,
    green_kpis,
    alerts_active,
  };

  return {
    data: { metrics, rows, updated_at: now },
    evidence: [
      buildViewEvidence({
        view_id: "operations.solari",
        filters: params.filters,
        records: rows,
        label: "Solari Board",
        value: rows.length,
      }),
    ],
  };
}
