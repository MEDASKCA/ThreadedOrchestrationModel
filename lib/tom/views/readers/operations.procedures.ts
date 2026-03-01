import { buildViewEvidence } from "./evidence";

// ─── read_opcs_tracking ───────────────────────────────────────────────────────

export async function read_opcs_tracking(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    opcs_code: string;
    procedure_name: string;
    specialty: string;
    count_mtd: number;
    count_ytd: number;
    avg_duration_mins: number;
  }> = [
    { opcs_code: "H01.1", procedure_name: "Laparoscopic Cholecystectomy",          specialty: "General Surgery",   count_mtd: 28, count_ytd: 143, avg_duration_mins: 65  },
    { opcs_code: "W37.1", procedure_name: "Total Hip Replacement",                  specialty: "Orthopaedics",      count_mtd: 12, count_ytd: 58,  avg_duration_mins: 105 },
    { opcs_code: "K40.1", procedure_name: "Coronary Artery Bypass Graft",           specialty: "Cardiothoracic",    count_mtd: 4,  count_ytd: 18,  avg_duration_mins: 220 },
    { opcs_code: "T20.3", procedure_name: "Laparoscopic Appendicectomy",            specialty: "General Surgery",   count_mtd: 18, count_ytd: 91,  avg_duration_mins: 50  },
    { opcs_code: "E20.1", procedure_name: "Functional Endoscopic Sinus Surgery",    specialty: "ENT",               count_mtd: 22, count_ytd: 108, avg_duration_mins: 45  },
    { opcs_code: "M61.1", procedure_name: "Transurethral Resection of Prostate",    specialty: "Urology",           count_mtd: 9,  count_ytd: 44,  avg_duration_mins: 75  },
    { opcs_code: "Q27.1", procedure_name: "Hysteroscopy and Endometrial Biopsy",    specialty: "Gynaecology",       count_mtd: 31, count_ytd: 156, avg_duration_mins: 30  },
    { opcs_code: "V44.1", procedure_name: "Anterior Cervical Discectomy and Fusion", specialty: "Neurosurgery",     count_mtd: 5,  count_ytd: 22,  avg_duration_mins: 150 },
  ];

  const total_procedure_types   = rows.length;
  const total_procedures_mtd    = rows.reduce((s, r) => s + r.count_mtd, 0);
  const topRow                  = rows.reduce((a, b) => b.count_mtd > a.count_mtd ? b : a);
  const top_procedure           = topRow.procedure_name;
  const avg_duration_across_all = Math.round(
    rows.reduce((s, r) => s + r.avg_duration_mins, 0) / rows.length
  );

  const metrics = {
    total_procedure_types,
    total_procedures_mtd,
    top_procedure,
    avg_duration_across_all,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.opcs",
        filters: params.filters,
        records: rows,
        label: "OPCS Tracking",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_procedure_requirements ──────────────────────────────────────────────

export async function read_procedure_requirements(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    procedure: string;
    specialty: string;
    equipment_required: string;
    staff_required: string;
    estimated_duration_mins: number;
    requires_icu_post_op: boolean;
    requires_specialist_anaes: boolean;
  }> = [
    {
      procedure: "Coronary Artery Bypass Graft",
      specialty: "Cardiothoracic",
      equipment_required: "Perfusion circuit, Heart-lung bypass machine, Sternal saw, Cell saver, Defibrillator",
      staff_required: "1x Surgeon + 1x Cardiothoracic Surgeon + 2x Scrub Nurses + 1x ODP + 1x Perfusionist",
      estimated_duration_mins: 220,
      requires_icu_post_op: true,
      requires_specialist_anaes: true,
    },
    {
      procedure: "Anterior Cervical Discectomy and Fusion",
      specialty: "Neurosurgery",
      equipment_required: "C-arm fluoroscopy, Operative microscope, Bone graft, Spinal instrumentation set",
      staff_required: "1x Surgeon + 1x Scrub Nurse + 1x ODP + 1x Radiographer",
      estimated_duration_mins: 150,
      requires_icu_post_op: true,
      requires_specialist_anaes: true,
    },
    {
      procedure: "Total Hip Replacement",
      specialty: "Orthopaedics",
      equipment_required: "Orthopaedic implant set, C-arm fluoroscopy, Surgical navigation system, Bone cement",
      staff_required: "1x Surgeon + 2x Scrub Nurses + 1x ODP",
      estimated_duration_mins: 105,
      requires_icu_post_op: false,
      requires_specialist_anaes: false,
    },
    {
      procedure: "Laparoscopic Cholecystectomy",
      specialty: "General Surgery",
      equipment_required: "Laparoscope tower, CO2 insufflator, Clip applier, Retrieval bag",
      staff_required: "1x Surgeon + 1x Scrub Nurse + 1x ODP",
      estimated_duration_mins: 65,
      requires_icu_post_op: false,
      requires_specialist_anaes: false,
    },
    {
      procedure: "Transurethral Resection of Prostate",
      specialty: "Urology",
      equipment_required: "Resectoscope, Diathermy unit, Continuous bladder irrigation set, Cystoscopy tower",
      staff_required: "1x Surgeon + 1x Scrub Nurse + 1x ODP",
      estimated_duration_mins: 75,
      requires_icu_post_op: false,
      requires_specialist_anaes: false,
    },
    {
      procedure: "Functional Endoscopic Sinus Surgery",
      specialty: "ENT",
      equipment_required: "Nasal endoscopy tower, Microdebrider, Image guidance system, Suction irrigation",
      staff_required: "1x Surgeon + 1x Scrub Nurse + 1x ODP",
      estimated_duration_mins: 45,
      requires_icu_post_op: false,
      requires_specialist_anaes: false,
    },
  ];

  const total_procedures_tracked     = rows.length;
  const requiring_icu_post_op        = rows.filter(r => r.requires_icu_post_op).length;
  const requiring_specialist_anaes   = rows.filter(r => r.requires_specialist_anaes).length;
  const mostComplexRow               = rows.reduce((a, b) => b.estimated_duration_mins > a.estimated_duration_mins ? b : a);
  const most_complex_procedure       = mostComplexRow.procedure;

  const metrics = {
    total_procedures_tracked,
    requiring_icu_post_op,
    requiring_specialist_anaes,
    most_complex_procedure,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.procedureReqs",
        filters: params.filters,
        records: rows,
        label: "Procedure Requirements",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_pre_op_checklist ────────────────────────────────────────────────────

export async function read_pre_op_checklist(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    patient_ref: string;
    procedure: string;
    consent_signed: boolean;
    bloods_done: boolean;
    ecg_done: boolean;
    anaes_review_done: boolean;
    fitness_confirmed: boolean;
    checklist_complete: boolean;
    notes: string;
  }> = [
    {
      patient_ref: "PTH-001",
      procedure: "Laparoscopic Cholecystectomy",
      consent_signed: true,
      bloods_done: true,
      ecg_done: true,
      anaes_review_done: true,
      fitness_confirmed: true,
      checklist_complete: true,
      notes: "",
    },
    {
      patient_ref: "PTH-002",
      procedure: "Total Hip Replacement",
      consent_signed: true,
      bloods_done: false,
      ecg_done: true,
      anaes_review_done: true,
      fitness_confirmed: false,
      checklist_complete: false,
      notes: "Awaiting repeat bloods - haemoglobin borderline",
    },
    {
      patient_ref: "PTH-003",
      procedure: "Coronary Artery Bypass Graft",
      consent_signed: true,
      bloods_done: true,
      ecg_done: true,
      anaes_review_done: true,
      fitness_confirmed: true,
      checklist_complete: true,
      notes: "",
    },
    {
      patient_ref: "PTH-004",
      procedure: "Hysteroscopy and Endometrial Biopsy",
      consent_signed: false,
      bloods_done: true,
      ecg_done: false,
      anaes_review_done: false,
      fitness_confirmed: false,
      checklist_complete: false,
      notes: "Consent not yet obtained - patient arriving at 07:30",
    },
    {
      patient_ref: "PTH-005",
      procedure: "Functional Endoscopic Sinus Surgery",
      consent_signed: true,
      bloods_done: true,
      ecg_done: true,
      anaes_review_done: true,
      fitness_confirmed: true,
      checklist_complete: true,
      notes: "",
    },
    {
      patient_ref: "PTH-006",
      procedure: "Transurethral Resection of Prostate",
      consent_signed: true,
      bloods_done: true,
      ecg_done: true,
      anaes_review_done: false,
      fitness_confirmed: false,
      checklist_complete: false,
      notes: "Awaiting anaesthetic review - CPET results pending",
    },
    {
      patient_ref: "PTH-007",
      procedure: "Laparoscopic Appendicectomy",
      consent_signed: true,
      bloods_done: true,
      ecg_done: true,
      anaes_review_done: true,
      fitness_confirmed: true,
      checklist_complete: true,
      notes: "",
    },
  ];

  const total_patients        = rows.length;
  const fully_complete        = rows.filter(r => r.checklist_complete).length;
  const incomplete            = rows.filter(r => !r.checklist_complete).length;
  const missing_consent       = rows.filter(r => !r.consent_signed).length;
  const missing_bloods        = rows.filter(r => !r.bloods_done).length;
  const missing_anaes_review  = rows.filter(r => !r.anaes_review_done).length;

  const metrics = {
    total_patients,
    fully_complete,
    incomplete,
    missing_consent,
    missing_bloods,
    missing_anaes_review,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.preop",
        filters: params.filters,
        records: rows,
        label: "Pre-Op Checklist Status",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_procedure_coding ────────────────────────────────────────────────────

export async function read_procedure_coding(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    patient_ref: string;
    procedure: string;
    opcs_code: string;
    icd10_code: string;
    status: "Coded" | "Pending" | "Query Raised";
    coder: string;
    coded_date: string;
  }> = [
    { patient_ref: "PTH-001", procedure: "Laparoscopic Cholecystectomy",          opcs_code: "H01.1", icd10_code: "K80.2", status: "Coded",        coder: "Sarah",  coded_date: "2026-02-24" },
    { patient_ref: "PTH-002", procedure: "Total Hip Replacement",                  opcs_code: "W37.1", icd10_code: "M16.1", status: "Coded",        coder: "James",  coded_date: "2026-02-24" },
    { patient_ref: "PTH-003", procedure: "Coronary Artery Bypass Graft",           opcs_code: "K40.1", icd10_code: "I25.1", status: "Query Raised", coder: "Sarah",  coded_date: ""           },
    { patient_ref: "PTH-004", procedure: "Hysteroscopy and Endometrial Biopsy",    opcs_code: "Q27.1", icd10_code: "N85.0", status: "Pending",      coder: "",       coded_date: ""           },
    { patient_ref: "PTH-005", procedure: "Functional Endoscopic Sinus Surgery",    opcs_code: "E20.1", icd10_code: "J32.0", status: "Coded",        coder: "Priya",  coded_date: "2026-02-25" },
    { patient_ref: "PTH-006", procedure: "Transurethral Resection of Prostate",    opcs_code: "M61.1", icd10_code: "N40.0", status: "Pending",      coder: "",       coded_date: ""           },
    { patient_ref: "PTH-007", procedure: "Laparoscopic Appendicectomy",            opcs_code: "T20.3", icd10_code: "K37.0", status: "Coded",        coder: "James",  coded_date: "2026-02-25" },
    { patient_ref: "PTH-008", procedure: "Anterior Cervical Discectomy and Fusion", opcs_code: "V44.1", icd10_code: "M50.1", status: "Query Raised", coder: "Priya", coded_date: ""           },
  ];

  const total_cases               = rows.length;
  const coded_count               = rows.filter(r => r.status === "Coded").length;
  const pending_count             = rows.filter(r => r.status === "Pending").length;
  const query_count               = rows.filter(r => r.status === "Query Raised").length;
  const coding_completeness_pct   = Math.round((coded_count / total_cases) * 1000) / 10;

  const metrics = {
    total_cases,
    coded_count,
    pending_count,
    query_count,
    coding_completeness_pct,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.coding",
        filters: params.filters,
        records: rows,
        label: "Procedure Coding",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_procedure_duration_trends ───────────────────────────────────────────

export async function read_procedure_duration_trends(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    procedure: string;
    specialty: string;
    planned_mins: number;
    avg_actual_mins: number;
    variance_mins: number;
    variance_pct: number;
    trend: "Improving" | "Stable" | "Worsening";
    cases_measured: number;
  }> = [
    { procedure: "Coronary Artery Bypass Graft",           specialty: "Cardiothoracic",  planned_mins: 220, avg_actual_mins: 248, variance_mins: 28, variance_pct: 12.7, trend: "Worsening",  cases_measured: 18  },
    { procedure: "Total Hip Replacement",                  specialty: "Orthopaedics",    planned_mins: 105, avg_actual_mins: 114, variance_mins: 9,  variance_pct: 8.6,  trend: "Stable",     cases_measured: 58  },
    { procedure: "Anterior Cervical Discectomy and Fusion", specialty: "Neurosurgery",   planned_mins: 150, avg_actual_mins: 162, variance_mins: 12, variance_pct: 8.0,  trend: "Worsening",  cases_measured: 22  },
    { procedure: "Laparoscopic Cholecystectomy",           specialty: "General Surgery", planned_mins: 65,  avg_actual_mins: 61,  variance_mins: -4, variance_pct: -6.2, trend: "Improving",  cases_measured: 143 },
    { procedure: "Functional Endoscopic Sinus Surgery",    specialty: "ENT",             planned_mins: 45,  avg_actual_mins: 44,  variance_mins: -1, variance_pct: -2.2, trend: "Stable",     cases_measured: 108 },
    { procedure: "Transurethral Resection of Prostate",    specialty: "Urology",         planned_mins: 75,  avg_actual_mins: 82,  variance_mins: 7,  variance_pct: 9.3,  trend: "Improving",  cases_measured: 44  },
  ];

  const procedures_tracked         = rows.length;
  const overrunning_procedures      = rows.filter(r => r.variance_mins > 0).length;
  const avg_variance_across_all_pct = Math.round(
    (rows.reduce((s, r) => s + r.variance_pct, 0) / rows.length) * 10
  ) / 10;
  const mostOverrunRow              = rows.reduce((a, b) => b.variance_mins > a.variance_mins ? b : a);
  const most_overrunning_procedure  = mostOverrunRow.procedure;

  const metrics = {
    procedures_tracked,
    overrunning_procedures,
    avg_variance_across_all_pct,
    most_overrunning_procedure,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.durationTrends",
        filters: params.filters,
        records: rows,
        label: "Procedure Duration Trends",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_theatre_list_composition ────────────────────────────────────────────

export async function read_theatre_list_composition(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    list_id: string;
    theatre: string;
    date: string;
    specialty: string;
    total_cases: number;
    major_cases: number;
    intermediate_cases: number;
    minor_cases: number;
    day_case_pct: number;
    estimated_finish_time: string;
  }> = [
    { list_id: "LST-001", theatre: "TH01", date: "2026-02-26", specialty: "General Surgery",  total_cases: 6, major_cases: 1, intermediate_cases: 3, minor_cases: 2, day_case_pct: 83.3, estimated_finish_time: "16:00" },
    { list_id: "LST-002", theatre: "TH02", date: "2026-02-26", specialty: "Orthopaedics",     total_cases: 4, major_cases: 2, intermediate_cases: 2, minor_cases: 0, day_case_pct: 50.0, estimated_finish_time: "17:30" },
    { list_id: "LST-003", theatre: "TH03", date: "2026-02-26", specialty: "Cardiothoracic",   total_cases: 2, major_cases: 2, intermediate_cases: 0, minor_cases: 0, day_case_pct: 0.0,  estimated_finish_time: "18:00" },
    { list_id: "LST-004", theatre: "TH04", date: "2026-02-26", specialty: "ENT",              total_cases: 8, major_cases: 0, intermediate_cases: 4, minor_cases: 4, day_case_pct: 100.0,estimated_finish_time: "15:30" },
    { list_id: "LST-005", theatre: "TH05", date: "2026-02-26", specialty: "Gynaecology",      total_cases: 5, major_cases: 0, intermediate_cases: 3, minor_cases: 2, day_case_pct: 80.0, estimated_finish_time: "16:30" },
  ];

  const total_lists_today   = rows.length;
  const total_cases_today   = rows.reduce((s, r) => s + r.total_cases, 0);
  const total_major         = rows.reduce((s, r) => s + r.major_cases, 0);
  const major_pct           = Math.round((total_major / total_cases_today) * 1000) / 10;
  const day_case_avg_pct    = Math.round(
    (rows.reduce((s, r) => s + r.day_case_pct, 0) / rows.length) * 10
  ) / 10;

  const metrics = {
    total_lists_today,
    total_cases_today,
    major_pct,
    day_case_avg_pct,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.theatreList",
        filters: params.filters,
        records: rows,
        label: "Theatre List Composition",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_backlog_by_procedure ────────────────────────────────────────────────

export async function read_backlog_by_procedure(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    category: string;
    procedure_count: number;
    avg_wait_weeks: number;
    longest_wait_weeks: number;
    target_wait_weeks: number;
    pct_within_target: number;
    rag_status: "green" | "amber" | "red";
  }> = [
    { category: "General Surgery - Laparoscopic",  procedure_count: 142, avg_wait_weeks: 14, longest_wait_weeks: 31, target_wait_weeks: 18, pct_within_target: 78.2, rag_status: "amber" },
    { category: "Orthopaedics - Joint Replacement", procedure_count: 218, avg_wait_weeks: 22, longest_wait_weeks: 52, target_wait_weeks: 18, pct_within_target: 41.3, rag_status: "red"   },
    { category: "Cardiothoracic - Bypass and Valve",procedure_count: 34,  avg_wait_weeks: 10, longest_wait_weeks: 18, target_wait_weeks: 18, pct_within_target: 94.1, rag_status: "green" },
    { category: "ENT - Elective Endoscopy",         procedure_count: 186, avg_wait_weeks: 11, longest_wait_weeks: 20, target_wait_weeks: 18, pct_within_target: 88.7, rag_status: "green" },
    { category: "Gynaecology - Hysteroscopy",       procedure_count: 97,  avg_wait_weeks: 16, longest_wait_weeks: 27, target_wait_weeks: 18, pct_within_target: 72.2, rag_status: "amber" },
    { category: "Urology - Urological Resections",  procedure_count: 73,  avg_wait_weeks: 19, longest_wait_weeks: 38, target_wait_weeks: 18, pct_within_target: 45.2, rag_status: "red"   },
    { category: "Neurosurgery - Spinal Procedures", procedure_count: 48,  avg_wait_weeks: 15, longest_wait_weeks: 24, target_wait_weeks: 18, pct_within_target: 68.8, rag_status: "amber" },
  ];

  const total_backlog           = rows.reduce((s, r) => s + r.procedure_count, 0);
  const categories_at_risk      = rows.filter(r => r.rag_status === "red" || r.rag_status === "amber").length;
  const avg_wait_weeks_overall  = Math.round(
    (rows.reduce((s, r) => s + r.avg_wait_weeks * r.procedure_count, 0) / total_backlog) * 10
  ) / 10;
  const longest_wait_overall_weeks = rows.reduce((a, b) => b.longest_wait_weeks > a.longest_wait_weeks ? b : a).longest_wait_weeks;

  const metrics = {
    total_backlog,
    categories_at_risk,
    avg_wait_weeks_overall,
    longest_wait_overall_weeks,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.backlog",
        filters: params.filters,
        records: rows,
        label: "Backlog by Procedure Type",
        value: rows.length,
      }),
    ],
  };
}
