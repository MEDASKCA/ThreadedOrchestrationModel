import { Pathway } from "./schema";

export type TableColumn = { key: string; label: string; width?: string };
export type TableRow = Record<string, string | number | null>;

const avg = (values: number[]) => {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};

const percent = (part: number, total: number) => {
  if (!total) return 0;
  return Math.round((part / total) * 100);
};

const groupBy = (pathways: Pathway[], key: keyof Pathway) => {
  const map = new Map<string, Pathway[]>();
  pathways.forEach((p) => {
    const value = String(p[key] ?? "Unknown");
    if (!map.has(value)) map.set(value, []);
    map.get(value)?.push(p);
  });
  return map;
};

export const buildWaitingListTable = (pathways: Pathway[]) => {
  const columns: TableColumn[] = [
    { key: "specialty", label: "Specialty", width: "180px" },
    { key: "total", label: "Total Waiting", width: "130px" },
    { key: "avg_wait", label: "Avg Wait (days)", width: "140px" },
    { key: "slot_util", label: "Slot Util (%)", width: "120px" },
    { key: "capacity_gap", label: "Capacity Gap", width: "120px" },
  ];

  const rows: TableRow[] = [];
  const grouped = groupBy(pathways, "specialty");
  grouped.forEach((items, specialty) => {
    const total = items.length;
    const scheduled = items.filter((p) => p.scheduled_date).length;
    rows.push({
      specialty,
      total,
      avg_wait: avg(items.map((p) => p.waiting_days)),
      slot_util: percent(scheduled, total),
      capacity_gap: Math.max(0, total - scheduled),
    });
  });

  return { columns, rows };
};

export const buildRttTable = (pathways: Pathway[]) => {
  const columns: TableColumn[] = [
    { key: "specialty", label: "Specialty", width: "180px" },
    { key: "within_18", label: "% Within 18w", width: "120px" },
    { key: "breach_52", label: "52w Breaches", width: "120px" },
    { key: "avg_wait", label: "Avg Wait", width: "100px" },
    { key: "median_wait", label: "Median Wait", width: "120px" },
  ];

  const rows: TableRow[] = [];
  const grouped = groupBy(pathways, "specialty");
  grouped.forEach((items, specialty) => {
    const total = items.length;
    const within18 = items.filter((p) => p.waiting_days <= 126).length;
    const breach52 = items.filter(
      (p) => p.rtt_status === "within_52_week" || p.waiting_days >= 364,
    ).length;
    const waits = items.map((p) => p.waiting_days);
    const sorted = [...waits].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    rows.push({
      specialty,
      within_18: percent(within18, total),
      breach_52: breach52,
      avg_wait: avg(waits),
      median_wait: Math.round(median),
    });
  });

  return { columns, rows };
};

export const buildCancerTable = (pathways: Pathway[]) => {
  const urgent = pathways.filter((p) => p.priority === "urgent");
  const columns: TableColumn[] = [
    { key: "specialty", label: "Specialty", width: "180px" },
    { key: "active", label: "Active 2WW", width: "110px" },
    { key: "compliance", label: "% ≤ 62d", width: "110px" },
    { key: "urgent_dx", label: "Urgent Dx Pending", width: "150px" },
    { key: "breaches", label: "Breaches", width: "100px" },
  ];

  const rows: TableRow[] = [];
  const grouped = groupBy(urgent, "specialty");
  grouped.forEach((items, specialty) => {
    const total = items.length;
    const within62 = items.filter((p) => p.waiting_days <= 62).length;
    rows.push({
      specialty,
      active: total,
      compliance: percent(within62, total),
      urgent_dx: items.filter((p) => p.stage === "diagnostics").length,
      breaches: items.filter((p) => p.rtt_status === "breaching").length,
    });
  });

  return { columns, rows };
};

export const buildReferralTable = (pathways: Pathway[]) => {
  const rows: TableRow[] = pathways
    .filter((p) => p.stage === "referral")
    .map((p) => ({
      patient: p.patient_name,
      specialty: p.specialty,
      consultant: p.consultant,
      waiting_days: p.waiting_days,
      status: p.rtt_status,
    }));

  const columns: TableColumn[] = [
    { key: "patient", label: "Patient", width: "220px" },
    { key: "specialty", label: "Specialty", width: "160px" },
    { key: "consultant", label: "Consultant", width: "170px" },
    { key: "waiting_days", label: "Waiting Days", width: "120px" },
    { key: "status", label: "RTT Status", width: "120px" },
  ];

  return { columns, rows };
};

export const buildTriageTable = (pathways: Pathway[]) => {
  const rows: TableRow[] = pathways
    .filter((p) => p.stage === "triage")
    .map((p) => ({
      patient: p.patient_name,
      consultant: p.consultant,
      waiting_days: p.waiting_days,
      status: p.rtt_status,
      priority: p.priority,
    }));

  const columns: TableColumn[] = [
    { key: "patient", label: "Patient", width: "220px" },
    { key: "consultant", label: "Consultant", width: "170px" },
    { key: "waiting_days", label: "Waiting Days", width: "120px" },
    { key: "priority", label: "Priority", width: "100px" },
    { key: "status", label: "RTT Status", width: "120px" },
  ];

  return { columns, rows };
};

export const buildBreachTable = (pathways: Pathway[]) => {
  const rows: TableRow[] = pathways
    .filter((p) => p.rtt_status === "breaching")
    .map((p) => ({
      patient: p.patient_name,
      specialty: p.specialty,
      waiting_days: p.waiting_days,
      cause: p.breach_root_cause ?? "unspecified",
      owner: p.owner_id ?? "Unassigned",
    }));

  const columns: TableColumn[] = [
    { key: "patient", label: "Patient", width: "220px" },
    { key: "specialty", label: "Specialty", width: "160px" },
    { key: "waiting_days", label: "Waiting Days", width: "120px" },
    { key: "cause", label: "Cause", width: "140px" },
    { key: "owner", label: "Owner", width: "140px" },
  ];

  return { columns, rows };
};

export const buildMilestoneTable = (pathways: Pathway[]) => {
  const columns: TableColumn[] = [
    { key: "stage", label: "Stage", width: "160px" },
    { key: "count", label: "Count", width: "100px" },
    { key: "avg_wait", label: "Avg Wait (days)", width: "140px" },
  ];

  const grouped = groupBy(pathways, "stage");
  const rows: TableRow[] = [];
  grouped.forEach((items, stage) => {
    rows.push({
      stage,
      count: items.length,
      avg_wait: avg(items.map((p) => p.waiting_days)),
    });
  });

  return { columns, rows };
};

export const buildClockTable = (pathways: Pathway[]) => {
  const rows: TableRow[] = pathways
    .filter((p) => p.clock_status !== "running" || !p.decision_to_treat_date)
    .map((p) => ({
      patient: p.patient_name,
      issue: p.decision_to_treat_date ? "Clock not running" : "Missing clock start",
      clock_status: p.clock_status,
      last_activity: p.last_activity_date,
    }));

  const columns: TableColumn[] = [
    { key: "patient", label: "Patient", width: "220px" },
    { key: "issue", label: "Issue", width: "200px" },
    { key: "clock_status", label: "Clock Status", width: "120px" },
    { key: "last_activity", label: "Last Activity", width: "140px" },
  ];

  return { columns, rows };
};

export const buildValidationTable = (pathways: Pathway[]) => {
  const rows: TableRow[] = pathways
    .filter((p) => p.validation_status !== "validated")
    .map((p) => ({
      patient: p.patient_name,
      issue: p.validation_status.replace(/_/g, " "),
      last_activity: p.last_activity_date,
      owner: p.owner_id ?? "Unassigned",
    }));

  const columns: TableColumn[] = [
    { key: "patient", label: "Patient", width: "220px" },
    { key: "issue", label: "Issue", width: "200px" },
    { key: "last_activity", label: "Last Activity", width: "140px" },
    { key: "owner", label: "Owner", width: "140px" },
  ];

  return { columns, rows };
};
