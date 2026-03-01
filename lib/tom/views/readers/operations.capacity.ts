import { buildViewEvidence } from "./evidence";

// ─── read_bed_management ─────────────────────────────────────────────────────

export async function read_bed_management(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { ward: "Ash Ward",    specialty: "General Medicine",  total_beds: 28, occupied: 24, available: 2, blocked: 2, occupancy_pct: 85.7 },
    { ward: "Birch Ward",  specialty: "Surgical",          total_beds: 22, occupied: 19, available: 2, blocked: 1, occupancy_pct: 86.4 },
    { ward: "Cedar Ward",  specialty: "Orthopaedics",      total_beds: 18, occupied: 15, available: 3, blocked: 0, occupancy_pct: 83.3 },
    { ward: "Douglas Ward",specialty: "Cardiology",        total_beds: 16, occupied: 14, available: 1, blocked: 1, occupancy_pct: 87.5 },
    { ward: "Elm Ward",    specialty: "Oncology",          total_beds: 12, occupied: 10, available: 2, blocked: 0, occupancy_pct: 83.3 },
    { ward: "Fir Ward",    specialty: "Gynaecology",       total_beds: 14, occupied: 11, available: 2, blocked: 1, occupancy_pct: 78.6 },
    { ward: "Hazel Ward",  specialty: "Respiratory",       total_beds: 20, occupied: 17, available: 1, blocked: 2, occupancy_pct: 85.0 },
    { ward: "Ivy Ward",    specialty: "Paediatrics",       total_beds: 10, occupied: 7,  available: 3, blocked: 0, occupancy_pct: 70.0 },
  ];

  const total_beds      = rows.reduce((s, r) => s + r.total_beds,  0);
  const total_occupied  = rows.reduce((s, r) => s + r.occupied,    0);
  const total_blocked   = rows.reduce((s, r) => s + r.blocked,     0);
  const total_available = rows.reduce((s, r) => s + r.available,   0);
  const overall_occupancy_pct = Math.round((total_occupied / total_beds) * 1000) / 10;

  const metrics = {
    total_beds,
    total_occupied,
    total_available,
    total_blocked,
    overall_occupancy_pct,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.beds",
        filters: params.filters,
        records: rows,
        label: "Bed Management",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_ward_capacity ───────────────────────────────────────────────────────

export async function read_ward_capacity(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { ward: "Ash Ward",    specialty: "General Medicine", beds_total: 28, beds_occupied: 24, beds_available: 2,  escalation_beds_open: 2, admissions_today: 4, discharges_today: 2, occupancy_pct: 85.7 },
    { ward: "Birch Ward",  specialty: "Surgical",         beds_total: 22, beds_occupied: 19, beds_available: 2,  escalation_beds_open: 1, admissions_today: 3, discharges_today: 3, occupancy_pct: 86.4 },
    { ward: "Cedar Ward",  specialty: "Orthopaedics",     beds_total: 18, beds_occupied: 15, beds_available: 3,  escalation_beds_open: 0, admissions_today: 2, discharges_today: 4, occupancy_pct: 83.3 },
    { ward: "Douglas Ward",specialty: "Cardiology",       beds_total: 16, beds_occupied: 14, beds_available: 1,  escalation_beds_open: 0, admissions_today: 2, discharges_today: 2, occupancy_pct: 87.5 },
    { ward: "Elm Ward",    specialty: "Oncology",         beds_total: 12, beds_occupied: 10, beds_available: 2,  escalation_beds_open: 0, admissions_today: 1, discharges_today: 1, occupancy_pct: 83.3 },
    { ward: "Fir Ward",    specialty: "Gynaecology",      beds_total: 14, beds_occupied: 11, beds_available: 2,  escalation_beds_open: 0, admissions_today: 2, discharges_today: 3, occupancy_pct: 78.6 },
    { ward: "Hazel Ward",  specialty: "Respiratory",      beds_total: 20, beds_occupied: 17, beds_available: 1,  escalation_beds_open: 0, admissions_today: 3, discharges_today: 2, occupancy_pct: 85.0 },
    { ward: "Ivy Ward",    specialty: "Paediatrics",      beds_total: 10, beds_occupied: 7,  beds_available: 3,  escalation_beds_open: 0, admissions_today: 1, discharges_today: 2, occupancy_pct: 70.0 },
  ];

  const total_wards              = rows.length;
  const full_wards               = rows.filter(r => r.beds_available <= 1).length;
  const escalation_beds_in_use   = rows.reduce((s, r) => s + r.escalation_beds_open, 0);
  const planned_discharges_today = rows.reduce((s, r) => s + r.discharges_today,     0);

  const metrics = {
    total_wards,
    full_wards,
    escalation_beds_in_use,
    planned_discharges_today,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.wardCapacity",
        filters: params.filters,
        records: rows,
        label: "Ward Capacity",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_icu_capacity ────────────────────────────────────────────────────────

export async function read_icu_capacity(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { unit: "GICU",  full_name: "General ICU",        total_beds: 12, level3_patients: 8, level2_patients: 2, available: 2, escalation_available: 0 },
    { unit: "HDU",   full_name: "High Dependency Unit",total_beds: 10, level3_patients: 0, level2_patients: 7, available: 3, escalation_available: 2 },
    { unit: "PICU",  full_name: "Paediatric ICU",      total_beds:  6, level3_patients: 2, level2_patients: 1, available: 3, escalation_available: 0 },
  ];

  const total_icu_beds  = rows.reduce((s, r) => s + r.total_beds,       0);
  const l3_occupied     = rows.reduce((s, r) => s + r.level3_patients,  0);
  const l2_occupied     = rows.reduce((s, r) => s + r.level2_patients,  0);
  const icu_available   = rows.reduce((s, r) => s + r.available,        0);
  const total_occupied  = l3_occupied + l2_occupied;
  const icu_occupancy_pct = Math.round((total_occupied / total_icu_beds) * 1000) / 10;

  const metrics = {
    total_icu_beds,
    l3_occupied,
    l2_occupied,
    icu_available,
    icu_occupancy_pct,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.icuCapacity",
        filters: params.filters,
        records: rows,
        label: "ICU Capacity",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_theatre_capacity ────────────────────────────────────────────────────

export async function read_theatre_capacity(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    theatre_id: string;
    specialty: string;
    status: "Active" | "Closed" | "Emergency Only";
    sessions_today: number;
    sessions_booked: number;
    sessions_available: number;
    next_available: string;
  }> = [
    { theatre_id: "TH01", specialty: "General Surgery",   status: "Active",         sessions_today: 2, sessions_booked: 2, sessions_available: 0, next_available: "2026-02-27" },
    { theatre_id: "TH02", specialty: "Orthopaedics",      status: "Active",         sessions_today: 2, sessions_booked: 1, sessions_available: 1, next_available: "2026-02-26" },
    { theatre_id: "TH03", specialty: "Cardiothoracic",    status: "Active",         sessions_today: 1, sessions_booked: 1, sessions_available: 0, next_available: "2026-02-27" },
    { theatre_id: "TH04", specialty: "ENT",               status: "Active",         sessions_today: 2, sessions_booked: 1, sessions_available: 1, next_available: "2026-02-26" },
    { theatre_id: "TH05", specialty: "Gynaecology",       status: "Active",         sessions_today: 2, sessions_booked: 2, sessions_available: 0, next_available: "2026-02-27" },
    { theatre_id: "TH06", specialty: "Emergency",         status: "Emergency Only", sessions_today: 0, sessions_booked: 0, sessions_available: 0, next_available: "2026-02-26" },
  ];

  const total_theatres    = rows.length;
  const active_theatres   = rows.filter(r => r.status === "Active").length;
  const sessions_today    = rows.reduce((s, r) => s + r.sessions_today,    0);
  const sessions_booked   = rows.reduce((s, r) => s + r.sessions_booked,   0);
  const sessions_available= rows.reduce((s, r) => s + r.sessions_available,0);
  const utilisation_pct   = sessions_today > 0
    ? Math.round((sessions_booked / sessions_today) * 1000) / 10
    : 0;

  const metrics = {
    total_theatres,
    active_theatres,
    sessions_today,
    sessions_available,
    utilisation_pct,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.theatreCapacity",
        filters: params.filters,
        records: rows,
        label: "Theatre Capacity",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_clinic_slot_availability ───────────────────────────────────────────

export async function read_clinic_slot_availability(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { clinic: "Cardiology AM Clinic", specialty: "Cardiology",      date: "2026-02-26", total_slots: 20, booked_slots: 18, available_slots: 2, utilisation_pct: 90.0, dna_expected: 2 },
    { clinic: "General Surgery Clinic",specialty: "General Surgery", date: "2026-02-26", total_slots: 16, booked_slots: 14, available_slots: 2, utilisation_pct: 87.5, dna_expected: 1 },
    { clinic: "Orthopaedics Clinic",  specialty: "Orthopaedics",    date: "2026-02-26", total_slots: 24, booked_slots: 22, available_slots: 2, utilisation_pct: 91.7, dna_expected: 3 },
    { clinic: "Respiratory Clinic",   specialty: "Respiratory",     date: "2026-02-26", total_slots: 18, booked_slots: 15, available_slots: 3, utilisation_pct: 83.3, dna_expected: 2 },
    { clinic: "Oncology Clinic",      specialty: "Oncology",        date: "2026-02-26", total_slots: 12, booked_slots: 12, available_slots: 0, utilisation_pct: 100.0,dna_expected: 1 },
    { clinic: "Neurology Clinic",     specialty: "Neurology",       date: "2026-02-26", total_slots: 10, booked_slots: 7,  available_slots: 3, utilisation_pct: 70.0, dna_expected: 1 },
  ];

  const total_clinics     = rows.length;
  const total_slots       = rows.reduce((s, r) => s + r.total_slots,    0);
  const total_booked      = rows.reduce((s, r) => s + r.booked_slots,   0);
  const total_available   = rows.reduce((s, r) => s + r.available_slots,0);
  const avg_utilisation_pct = Math.round(
    (rows.reduce((s, r) => s + r.utilisation_pct, 0) / rows.length) * 10
  ) / 10;

  const metrics = {
    total_clinics,
    total_slots,
    total_booked,
    total_available,
    avg_utilisation_pct,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.clinicSlots",
        filters: params.filters,
        records: rows,
        label: "Clinic Slot Availability",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_session_planner ─────────────────────────────────────────────────────

export async function read_session_planner(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    session_id: string;
    date: string;
    theatre: string;
    specialty: string;
    surgeon: string;
    anaesthetist: string;
    planned_cases: number;
    confirmed_cases: number;
    status: "Confirmed" | "At Risk" | "Pending";
  }> = [
    { session_id: "SES-001", date: "2026-02-26", theatre: "TH01", specialty: "General Surgery",  surgeon: "Patel",    anaesthetist: "O'Brien",  planned_cases: 4, confirmed_cases: 4, status: "Confirmed" },
    { session_id: "SES-002", date: "2026-02-26", theatre: "TH02", specialty: "Orthopaedics",     surgeon: "Sharma",   anaesthetist: "TBC",      planned_cases: 3, confirmed_cases: 2, status: "At Risk"   },
    { session_id: "SES-003", date: "2026-02-26", theatre: "TH03", specialty: "Cardiothoracic",   surgeon: "Williams", anaesthetist: "Hassan",   planned_cases: 2, confirmed_cases: 2, status: "Confirmed" },
    { session_id: "SES-004", date: "2026-02-26", theatre: "TH04", specialty: "ENT",              surgeon: "Ahmed",    anaesthetist: "Nguyen",   planned_cases: 5, confirmed_cases: 4, status: "Pending"   },
    { session_id: "SES-005", date: "2026-02-26", theatre: "TH05", specialty: "Gynaecology",      surgeon: "Clarke",   anaesthetist: "Johansson",planned_cases: 4, confirmed_cases: 4, status: "Confirmed" },
  ];

  const sessions_today = rows.length;
  const confirmed      = rows.filter(r => r.status === "Confirmed").length;
  const at_risk        = rows.filter(r => r.status === "At Risk").length;
  const pending        = rows.filter(r => r.status === "Pending").length;

  const metrics = { sessions_today, confirmed, at_risk, pending };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.sessionPlanner",
        filters: params.filters,
        records: rows,
        label: "Session Planner",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_template_utilisation ────────────────────────────────────────────────

export async function read_template_utilisation(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { template_name: "General Surgery Standard",   specialty: "General Surgery",  sessions_planned: 40, sessions_run: 38, utilisation_pct: 95.0, avg_case_completion_pct: 93.2, weeks_tracked: 20 },
    { template_name: "Orthopaedics Elective List",  specialty: "Orthopaedics",     sessions_planned: 36, sessions_run: 30, utilisation_pct: 83.3, avg_case_completion_pct: 87.5, weeks_tracked: 18 },
    { template_name: "Cardiothoracic Routine",      specialty: "Cardiothoracic",   sessions_planned: 20, sessions_run: 19, utilisation_pct: 95.0, avg_case_completion_pct: 96.1, weeks_tracked: 10 },
    { template_name: "ENT Day Case Template",       specialty: "ENT",              sessions_planned: 30, sessions_run: 26, utilisation_pct: 86.7, avg_case_completion_pct: 91.0, weeks_tracked: 15 },
    { template_name: "Gynaecology Elective",        specialty: "Gynaecology",      sessions_planned: 28, sessions_run: 18, utilisation_pct: 64.3, avg_case_completion_pct: 78.3, weeks_tracked: 14 },
    { template_name: "Respiratory Procedure Suite", specialty: "Respiratory",      sessions_planned: 24, sessions_run: 17, utilisation_pct: 70.8, avg_case_completion_pct: 82.6, weeks_tracked: 12 },
  ];

  const templates_tracked    = rows.length;
  const avg_utilisation_pct  = Math.round(
    (rows.reduce((s, r) => s + r.utilisation_pct, 0) / rows.length) * 10
  ) / 10;
  const THRESHOLD = 80;
  const fully_utilised_count = rows.filter(r => r.utilisation_pct >= 90).length;
  const below_threshold_count= rows.filter(r => r.utilisation_pct < THRESHOLD).length;

  const metrics = {
    templates_tracked,
    avg_utilisation_pct,
    fully_utilised_count,
    below_threshold_count,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.templateUtil",
        filters: params.filters,
        records: rows,
        label: "Template Utilisation",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_surge_planning ──────────────────────────────────────────────────────

export async function read_surge_planning(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows = [
    { site: "City Hospital",       opel_level: 2, surge_beds_available: 8, escalation_beds_open: 0, surge_plan_activated: false, last_reviewed: "2026-02-26T07:30:00.000Z" },
    { site: "Royal Infirmary",     opel_level: 3, surge_beds_available: 4, escalation_beds_open: 4, surge_plan_activated: true,  last_reviewed: "2026-02-26T06:45:00.000Z" },
    { site: "Community Hospital",  opel_level: 1, surge_beds_available: 6, escalation_beds_open: 0, surge_plan_activated: false, last_reviewed: "2026-02-26T08:00:00.000Z" },
  ];

  const sites_at_opel3_plus         = rows.filter(r => r.opel_level >= 3).length;
  const total_surge_beds_available  = rows.reduce((s, r) => s + r.surge_beds_available,   0);
  const escalation_beds_in_use      = rows.reduce((s, r) => s + r.escalation_beds_open,   0);
  const sites_on_surge_plan         = rows.filter(r => r.surge_plan_activated).length;

  const metrics = {
    sites_at_opel3_plus,
    total_surge_beds_available,
    escalation_beds_in_use,
    sites_on_surge_plan,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.surge",
        filters: params.filters,
        records: rows,
        label: "Surge Planning",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_forward_capacity ────────────────────────────────────────────────────

export async function read_forward_capacity(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    date: string;
    projected_demand: number;
    available_capacity: number;
    gap: number;
    risk_level: "Low" | "Medium" | "High";
  }> = [
    { date: "2026-02-26", projected_demand: 118, available_capacity: 124, gap:  -6, risk_level: "Low"    },
    { date: "2026-02-27", projected_demand: 122, available_capacity: 124, gap:  -2, risk_level: "Low"    },
    { date: "2026-02-28", projected_demand: 129, available_capacity: 126, gap:   3, risk_level: "Medium" },
    { date: "2026-03-01", projected_demand: 134, available_capacity: 126, gap:   8, risk_level: "High"   },
    { date: "2026-03-02", projected_demand: 121, available_capacity: 124, gap:  -3, risk_level: "Low"    },
    { date: "2026-03-03", projected_demand: 115, available_capacity: 120, gap:  -5, risk_level: "Low"    },
    { date: "2026-03-04", projected_demand: 119, available_capacity: 122, gap:  -3, risk_level: "Low"    },
  ];

  const days_at_risk         = rows.filter(r => r.risk_level === "Medium" || r.risk_level === "High").length;
  const peakRow              = rows.reduce((a, b) => b.projected_demand > a.projected_demand ? b : a);
  const peak_demand_date     = peakRow.date;
  const peak_demand          = peakRow.projected_demand;
  const lowestCapRow         = rows.reduce((a, b) => b.available_capacity < a.available_capacity ? b : a);
  const lowest_capacity_date = lowestCapRow.date;

  const metrics = {
    days_at_risk,
    peak_demand_date,
    peak_demand,
    lowest_capacity_date,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.forwardCapacity",
        filters: params.filters,
        records: rows,
        label: "7-Day Forward Capacity",
        value: rows.length,
      }),
    ],
  };
}
