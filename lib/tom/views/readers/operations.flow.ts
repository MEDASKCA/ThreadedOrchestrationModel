import { buildViewEvidence } from "./evidence";

// ─── read_delayed_discharges ──────────────────────────────────────────────────

export async function read_delayed_discharges(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    ward: string;
    patient_ref: string;
    delay_days: number;
    reason: string;
    action_owner: string;
    escalated: boolean;
  }> = [
    { ward: "Ash Ward",      patient_ref: "PT-114", delay_days: 8,  reason: "Awaiting Social Care Package", action_owner: "Discharge Team",      escalated: true  },
    { ward: "Birch Ward",    patient_ref: "PT-087", delay_days: 3,  reason: "Awaiting Placement",           action_owner: "Social Services",      escalated: false },
    { ward: "Cedar Ward",    patient_ref: "PT-203", delay_days: 11, reason: "Awaiting Social Care Package", action_owner: "Integrated Care Board", escalated: true  },
    { ward: "Ash Ward",      patient_ref: "PT-156", delay_days: 2,  reason: "Awaiting Transport",           action_owner: "Patient Transport",    escalated: false },
    { ward: "Elm Ward",      patient_ref: "PT-072", delay_days: 5,  reason: "Family Decision",              action_owner: "Ward Team",            escalated: false },
    { ward: "Birch Ward",    patient_ref: "PT-219", delay_days: 14, reason: "Awaiting Placement",           action_owner: "Social Services",      escalated: true  },
    { ward: "Cedar Ward",    patient_ref: "PT-041", delay_days: 1,  reason: "Awaiting Test Results",        action_owner: "Radiology",            escalated: false },
    { ward: "Maple Ward",    patient_ref: "PT-188", delay_days: 6,  reason: "Medical Complexity",           action_owner: "Consultant Team",      escalated: false },
  ];

  const total_delayed             = rows.length;
  const avg_delay_days            = Math.round(rows.reduce((s, r) => s + r.delay_days, 0) / rows.length * 10) / 10;
  const longest_delay_days        = rows.reduce((a, b) => b.delay_days > a.delay_days ? b : a).delay_days;
  const awaiting_social_care_count = rows.filter(r => r.reason === "Awaiting Social Care Package").length;
  const escalated_count           = rows.filter(r => r.escalated).length;

  const metrics = {
    total_delayed,
    avg_delay_days,
    longest_delay_days,
    awaiting_social_care_count,
    escalated_count,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.delayedDischarge",
        filters: params.filters,
        records: rows,
        label: "Delayed Discharges",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_internal_transfers ──────────────────────────────────────────────────

export async function read_internal_transfers(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    from_ward: string;
    to_ward: string;
    reason: string;
    transfer_type: "Planned" | "Emergency";
    requested_at: string;
    status: "Completed" | "In Transit" | "Awaiting Bed";
  }> = [
    { from_ward: "Ash Ward",      to_ward: "HDU",           reason: "Step Up",         transfer_type: "Emergency", requested_at: "06:45", status: "Completed"   },
    { from_ward: "HDU",           to_ward: "Birch Ward",    reason: "Step Down",       transfer_type: "Planned",   requested_at: "08:00", status: "Completed"   },
    { from_ward: "Cedar Ward",    to_ward: "Isolation Bay", reason: "Isolation",       transfer_type: "Planned",   requested_at: "08:30", status: "In Transit"  },
    { from_ward: "Elm Ward",      to_ward: "Ash Ward",      reason: "Overflow",        transfer_type: "Planned",   requested_at: "09:15", status: "Awaiting Bed"},
    { from_ward: "Maple Ward",    to_ward: "Cardiology",    reason: "Specialty Change",transfer_type: "Planned",   requested_at: "09:45", status: "Completed"   },
    { from_ward: "Birch Ward",    to_ward: "ICU",           reason: "Step Up",         transfer_type: "Emergency", requested_at: "10:20", status: "In Transit"  },
    { from_ward: "Orthopaedics",  to_ward: "Elm Ward",      reason: "Overflow",        transfer_type: "Planned",   requested_at: "11:00", status: "Awaiting Bed"},
  ];

  const total_transfers_today = rows.length;
  const completed             = rows.filter(r => r.status === "Completed").length;
  const in_progress           = rows.filter(r => r.status === "In Transit").length;
  const awaiting_bed          = rows.filter(r => r.status === "Awaiting Bed").length;
  const emergency_transfers   = rows.filter(r => r.transfer_type === "Emergency").length;

  const metrics = {
    total_transfers_today,
    completed,
    in_progress,
    awaiting_bed,
    emergency_transfers,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.transfers",
        filters: params.filters,
        records: rows,
        label: "Internal Transfers",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_blocked_beds ────────────────────────────────────────────────────────

export async function read_blocked_beds(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    ward: string;
    bed_ref: string;
    reason: string;
    blocked_since_hrs: number;
    action_required: string;
    priority: "High" | "Medium" | "Low";
  }> = [
    { ward: "Ash Ward",      bed_ref: "ASH-04", reason: "Deep Clean Required",           blocked_since_hrs: 6,  action_required: "Domestic team to complete enhanced clean",    priority: "High"   },
    { ward: "Birch Ward",    bed_ref: "BIR-11", reason: "Infection Control Hold",         blocked_since_hrs: 18, action_required: "IPC team sign-off required before use",       priority: "High"   },
    { ward: "Cedar Ward",    bed_ref: "CED-07", reason: "Equipment Fault",                blocked_since_hrs: 4,  action_required: "Maintenance to repair bed motor",             priority: "Medium" },
    { ward: "Elm Ward",      bed_ref: "ELM-02", reason: "Awaiting Maintenance",           blocked_since_hrs: 12, action_required: "Plumbing fault - estates notified",           priority: "Medium" },
    { ward: "Maple Ward",    bed_ref: "MAP-09", reason: "Reserved for Incoming Transfer", blocked_since_hrs: 1,  action_required: "Hold until ICU step-down patient arrives",    priority: "Low"    },
    { ward: "Orthopaedics",  bed_ref: "ORT-05", reason: "Deep Clean Required",            blocked_since_hrs: 3,  action_required: "Domestic supervisor to allocate cleaning slot",priority: "Medium" },
  ];

  const total_blocked_beds  = rows.length;
  const high_priority       = rows.filter(r => r.priority === "High").length;
  const avg_blocked_hrs     = Math.round(rows.reduce((s, r) => s + r.blocked_since_hrs, 0) / rows.length * 10) / 10;
  const longest_blocked_hrs = rows.reduce((a, b) => b.blocked_since_hrs > a.blocked_since_hrs ? b : a).blocked_since_hrs;

  const metrics = {
    total_blocked_beds,
    high_priority,
    avg_blocked_hrs,
    longest_blocked_hrs,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.blockedBeds",
        filters: params.filters,
        records: rows,
        label: "Blocked Beds",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_capacity_alerts ─────────────────────────────────────────────────────

export async function read_capacity_alerts(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    alert_id: string;
    alert_type: string;
    severity: "Critical" | "High" | "Medium";
    message: string;
    raised_at: string;
    status: "Active" | "Acknowledged" | "Escalated";
    assigned_to: string;
  }> = [
    {
      alert_id: "ALRT-001",
      alert_type: "ICU Full",
      severity: "Critical",
      message: "ICU at 100% capacity with 2 patients awaiting transfer from theatre recovery - no beds available",
      raised_at: "2026-02-26T09:12:00",
      status: "Escalated",
      assigned_to: "Critical Care",
    },
    {
      alert_id: "ALRT-002",
      alert_type: "Bed Pressure",
      severity: "High",
      message: "Medical wards at 97% occupancy - 4 emergency admissions awaiting inpatient beds in A&E",
      raised_at: "2026-02-26T07:45:00",
      status: "Active",
      assigned_to: "Site Management",
    },
    {
      alert_id: "ALRT-003",
      alert_type: "Theatre Overrun",
      severity: "High",
      message: "TH03 Cardiothoracic list running 35 minutes over plan - downstream recovery impact expected",
      raised_at: "2026-02-26T11:30:00",
      status: "Acknowledged",
      assigned_to: "Theatres Manager",
    },
    {
      alert_id: "ALRT-004",
      alert_type: "Staffing Gap",
      severity: "Medium",
      message: "Ash Ward short one Band 5 nurse for afternoon shift - bank cover requested but not yet confirmed",
      raised_at: "2026-02-26T08:00:00",
      status: "Active",
      assigned_to: "Workforce Team",
    },
    {
      alert_id: "ALRT-005",
      alert_type: "Equipment Unavailable",
      severity: "Medium",
      message: "Portable C-arm unit unavailable due to servicing - orthopaedic afternoon list may be impacted",
      raised_at: "2026-02-26T10:15:00",
      status: "Active",
      assigned_to: "Medical Engineering",
    },
  ];

  const total_active      = rows.filter(r => r.status === "Active" || r.status === "Escalated").length;
  const critical_count    = rows.filter(r => r.severity === "Critical").length;
  const high_count        = rows.filter(r => r.severity === "High").length;
  const medium_count      = rows.filter(r => r.severity === "Medium").length;
  const acknowledged_count = rows.filter(r => r.status === "Acknowledged").length;

  const metrics = {
    total_active,
    critical_count,
    high_count,
    medium_count,
    acknowledged_count,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.capacityAlerts",
        filters: params.filters,
        records: rows,
        label: "Capacity Alerts",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_opel ────────────────────────────────────────────────────────────────

export async function read_opel(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    site: string;
    opel_level: number;
    opel_label: string;
    key_issues: string;
    actions_taken: string;
    last_reviewed: string;
    rag_status: "green" | "amber" | "red";
  }> = [
    {
      site: "City Hospital",
      opel_level: 2,
      opel_label: "OPEL 2 - Pressured",
      key_issues: "Bed pressure on medical wards, ICU at capacity, delayed discharges",
      actions_taken: "Discharge team mobilised, escalation calls commenced, bed managers reviewing",
      last_reviewed: "2026-02-26T10:00:00",
      rag_status: "amber",
    },
    {
      site: "Royal Infirmary",
      opel_level: 3,
      opel_label: "OPEL 3 - Escalated",
      key_issues: "Emergency overflow, surgical cancellations, reduced A&E capacity, ambulance divert risk",
      actions_taken: "OPEL 3 escalation plan activated, CEO notified, mutual aid requested from City Hospital",
      last_reviewed: "2026-02-26T09:30:00",
      rag_status: "red",
    },
    {
      site: "Community Hospital",
      opel_level: 1,
      opel_label: "OPEL 1 - Normal",
      key_issues: "None identified",
      actions_taken: "Routine monitoring in place",
      last_reviewed: "2026-02-26T08:00:00",
      rag_status: "green",
    },
  ];

  const highest_opel_level        = rows.reduce((a, b) => b.opel_level > a.opel_level ? b : a).opel_level;
  const sites_at_opel3_plus       = rows.filter(r => r.opel_level >= 3).length;
  const sites_on_escalation_plan  = rows.filter(r => r.opel_level >= 3).length;
  const overall_system_opel       = highest_opel_level;

  const metrics = {
    highest_opel_level,
    sites_at_opel3_plus,
    sites_on_escalation_plan,
    overall_system_opel,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.opel",
        filters: params.filters,
        records: rows,
        label: "Escalation Level (OPEL)",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_incident_flags ──────────────────────────────────────────────────────

export async function read_incident_flags(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    incident_id: string;
    incident_type: string;
    severity: "Serious" | "Moderate" | "Minor";
    department: string;
    raised_by: string;
    raised_at: string;
    status: "Open" | "Under Review" | "Resolved";
    days_open: number;
  }> = [
    { incident_id: "INC-001", incident_type: "Patient Fall",             severity: "Serious",  department: "Ash Ward",        raised_by: "Rachel",  raised_at: "2026-02-24", status: "Under Review", days_open: 2  },
    { incident_id: "INC-002", incident_type: "Medication Error",         severity: "Moderate", department: "Birch Ward",      raised_by: "Tom",     raised_at: "2026-02-25", status: "Open",         days_open: 1  },
    { incident_id: "INC-003", incident_type: "Equipment Failure",        severity: "Minor",    department: "Theatres",        raised_by: "Priya",   raised_at: "2026-02-26", status: "Open",         days_open: 0  },
    { incident_id: "INC-004", incident_type: "Infection Control Breach", severity: "Serious",  department: "Cedar Ward",      raised_by: "James",   raised_at: "2026-02-20", status: "Under Review", days_open: 6  },
    { incident_id: "INC-005", incident_type: "Staffing Incident",        severity: "Moderate", department: "Emergency Dept",  raised_by: "Sarah",   raised_at: "2026-02-23", status: "Open",         days_open: 3  },
    { incident_id: "INC-006", incident_type: "Clinical Concern",         severity: "Serious",  department: "ICU",             raised_by: "Michael", raised_at: "2026-02-26", status: "Open",         days_open: 0  },
    { incident_id: "INC-007", incident_type: "Medication Error",         severity: "Minor",    department: "Maple Ward",      raised_by: "Laura",   raised_at: "2026-02-22", status: "Resolved",     days_open: 4  },
  ];

  const open_rows           = rows.filter(r => r.status !== "Resolved");
  const total_open          = open_rows.length;
  const serious_count       = rows.filter(r => r.severity === "Serious").length;
  const moderate_count      = rows.filter(r => r.severity === "Moderate").length;
  const avg_days_open       = open_rows.length > 0
    ? Math.round(open_rows.reduce((s, r) => s + r.days_open, 0) / open_rows.length * 10) / 10
    : 0;
  const overdue_review_count = open_rows.filter(r => r.days_open > 2).length;

  const metrics = {
    total_open,
    serious_count,
    moderate_count,
    avg_days_open,
    overdue_review_count,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.incidentFlags",
        filters: params.filters,
        records: rows,
        label: "Incident Flags",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_emergency_pressure ──────────────────────────────────────────────────

export async function read_emergency_pressure(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    metric: string;
    current_value: string;
    threshold: string;
    unit: string;
    rag_status: "green" | "amber" | "red";
    trend: "Improving" | "Stable" | "Worsening";
  }> = [
    { metric: "A&E 4-Hour Wait",                  current_value: "71.2",  threshold: "95",   unit: "%",           rag_status: "red",   trend: "Worsening"  },
    { metric: "Ambulance Offload Time",            current_value: "38",    threshold: "15",   unit: "mins",        rag_status: "red",   trend: "Stable"     },
    { metric: "Trolley Waits Over 12 Hours",       current_value: "4",     threshold: "0",    unit: "patients",    rag_status: "red",   trend: "Worsening"  },
    { metric: "Medical Beds Unavailable",          current_value: "12",    threshold: "5",    unit: "beds",        rag_status: "amber", trend: "Worsening"  },
    { metric: "Emergency Admissions vs Plan",      current_value: "114",   threshold: "100",  unit: "admissions",  rag_status: "amber", trend: "Stable"     },
    { metric: "MH Crisis Referrals",               current_value: "7",     threshold: "5",    unit: "referrals",   rag_status: "amber", trend: "Improving"  },
    { metric: "Ambulance Handover Breaches",       current_value: "3",     threshold: "0",    unit: "breaches",    rag_status: "red",   trend: "Stable"     },
    { metric: "Triage Category 1 Response",        current_value: "98.4",  threshold: "95",   unit: "%",           rag_status: "green", trend: "Stable"     },
  ];

  const red_indicators    = rows.filter(r => r.rag_status === "red").length;
  const amber_indicators  = rows.filter(r => r.rag_status === "amber").length;
  const green_indicators  = rows.filter(r => r.rag_status === "green").length;
  const criticalRow       = rows.filter(r => r.rag_status === "red" && r.trend === "Worsening")[0] ?? rows.find(r => r.rag_status === "red");
  const critical_metric   = criticalRow?.metric ?? "None";

  const metrics = {
    red_indicators,
    amber_indicators,
    green_indicators,
    critical_metric,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.emergency",
        filters: params.filters,
        records: rows,
        label: "Emergency Pressure Indicators",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_same_day_cancellations ──────────────────────────────────────────────

export async function read_same_day_cancellations(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    session_ref: string;
    specialty: string;
    patient_ref: string;
    reason: "Patient Unwell" | "Bed Unavailable" | "Theatre Overrun" | "Anaesthesia Concern" | "Equipment Fault" | "Consent Withdrawn";
    cancelled_at: string;
    rebooked: boolean;
    rebooked_date: string;
  }> = [
    { session_ref: "SES-TH02-AM", specialty: "Orthopaedics",    patient_ref: "PT-102", reason: "Bed Unavailable",    cancelled_at: "07:15", rebooked: true,  rebooked_date: "2026-03-05" },
    { session_ref: "SES-TH03-AM", specialty: "Cardiothoracic",  patient_ref: "PT-077", reason: "Patient Unwell",     cancelled_at: "08:00", rebooked: false, rebooked_date: ""           },
    { session_ref: "SES-TH04-AM", specialty: "ENT",             patient_ref: "PT-145", reason: "Theatre Overrun",    cancelled_at: "12:45", rebooked: true,  rebooked_date: "2026-03-10" },
    { session_ref: "SES-TH05-AM", specialty: "Gynaecology",     patient_ref: "PT-098", reason: "Anaesthesia Concern",cancelled_at: "09:30", rebooked: false, rebooked_date: ""           },
    { session_ref: "SES-TH01-PM", specialty: "General Surgery", patient_ref: "PT-163", reason: "Bed Unavailable",    cancelled_at: "13:10", rebooked: true,  rebooked_date: "2026-03-04" },
  ];

  const total_cancellations_today = rows.length;
  const rebooked_count            = rows.filter(r => r.rebooked).length;
  const not_rebooked_count        = rows.filter(r => !r.rebooked).length;

  const reasonCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
  const most_common_reason = Object.entries(reasonCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0];

  const metrics = {
    total_cancellations_today,
    rebooked_count,
    not_rebooked_count,
    most_common_reason,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.sameDayCancel",
        filters: params.filters,
        records: rows,
        label: "Same-Day Cancellations",
        value: rows.length,
      }),
    ],
  };
}

// ─── read_risk_feed ───────────────────────────────────────────────────────────

export async function read_risk_feed(params: {
  filters?: Record<string, any>;
}): Promise<{ data: any; evidence: any[] }> {
  const rows: Array<{
    risk_id: string;
    risk_type: string;
    description: string;
    risk_level: "Critical" | "High" | "Medium" | "Low";
    raised_at: string;
    assigned_to: string;
    status: "Active" | "Monitoring" | "Mitigated";
  }> = [
    {
      risk_id: "RSK-001",
      risk_type: "Capacity Risk",
      description: "ICU at 100% occupancy with no step-down capacity, creating risk of surgical cancellations if further emergencies arise.",
      risk_level: "Critical",
      raised_at: "2026-02-26T09:00:00",
      assigned_to: "Critical Care",
      status: "Active",
    },
    {
      risk_id: "RSK-002",
      risk_type: "Operational Risk",
      description: "Royal Infirmary on OPEL 3 with ambulance divert risk if two further category 1 patients present simultaneously.",
      risk_level: "Critical",
      raised_at: "2026-02-26T09:30:00",
      assigned_to: "Site Management",
      status: "Active",
    },
    {
      risk_id: "RSK-003",
      risk_type: "Clinical Risk",
      description: "Two patients with trolley waits exceeding 12 hours in A&E, raising deterioration and safety event risk.",
      risk_level: "High",
      raised_at: "2026-02-26T08:15:00",
      assigned_to: "Emergency Department",
      status: "Active",
    },
    {
      risk_id: "RSK-004",
      risk_type: "Workforce Risk",
      description: "Ash Ward afternoon shift short-staffed at Band 5 level with bank cover unconfirmed as of 10:00.",
      risk_level: "High",
      raised_at: "2026-02-26T08:00:00",
      assigned_to: "Workforce Team",
      status: "Active",
    },
    {
      risk_id: "RSK-005",
      risk_type: "Compliance Risk",
      description: "Infection control breach on Cedar Ward pending IPC sign-off, with potential for ward bay closure if unresolved by midday.",
      risk_level: "High",
      raised_at: "2026-02-26T07:45:00",
      assigned_to: "Infection Control",
      status: "Monitoring",
    },
    {
      risk_id: "RSK-006",
      risk_type: "Operational Risk",
      description: "Portable C-arm unavailable for servicing, with risk of afternoon orthopaedic list delays if alternative not sourced.",
      risk_level: "Medium",
      raised_at: "2026-02-26T10:15:00",
      assigned_to: "Medical Engineering",
      status: "Active",
    },
    {
      risk_id: "RSK-007",
      risk_type: "Clinical Risk",
      description: "Cardiothoracic theatre running 35 minutes over plan, creating downstream recovery and HDU capacity pressure.",
      risk_level: "Medium",
      raised_at: "2026-02-26T11:30:00",
      assigned_to: "Theatres Manager",
      status: "Monitoring",
    },
    {
      risk_id: "RSK-008",
      risk_type: "Capacity Risk",
      description: "Delayed discharges across City Hospital currently at 8 patients, reducing bed availability for planned admissions.",
      risk_level: "Low",
      raised_at: "2026-02-26T08:30:00",
      assigned_to: "Discharge Team",
      status: "Mitigated",
    },
  ];

  const active_rows        = rows.filter(r => r.status !== "Mitigated");
  const total_active_risks = active_rows.length;
  const critical_count     = rows.filter(r => r.risk_level === "Critical").length;
  const high_count         = rows.filter(r => r.risk_level === "High").length;
  const risks_assigned     = rows.filter(r => r.assigned_to && r.assigned_to.length > 0).length;
  const unassigned_count   = rows.filter(r => !r.assigned_to || r.assigned_to.length === 0).length;

  const metrics = {
    total_active_risks,
    critical_count,
    high_count,
    risks_assigned,
    unassigned_count,
  };

  return {
    data: { metrics, rows, updated_at: new Date().toISOString() },
    evidence: [
      buildViewEvidence({
        view_id: "operations.riskFeed",
        filters: params.filters,
        records: rows,
        label: "Real-Time Risk Feed",
        value: rows.length,
      }),
    ],
  };
}
