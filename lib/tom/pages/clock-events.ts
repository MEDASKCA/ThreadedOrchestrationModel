export type ClockTileKey =
  | "clock_start_anomalies"
  | "suspended_clocks"
  | "stop_without_procedure"
  | "duplicate_clocks"
  | "manual_overrides";

export type ClockAnomalyRow = {
  patient_name: string;
  issue: string;
  clock_status?: "running" | "suspended" | "stopped" | string;
  last_activity?: string;
};

export type ClockStartsStopsPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<ClockTileKey, number>>;
  rows: ClockAnomalyRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeStatus = (value: unknown): string | undefined => {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return undefined;
  return text.replace(/[\s-]+/g, "_");
};

const normalizeRow = (row: any): ClockAnomalyRow | null => {
  if (!row || typeof row !== "object") return null;
  const patient_name = String(row.patient_name ?? row.patient ?? row.name ?? "").trim();
  const issue = String(row.issue ?? "").trim();
  if (!patient_name || !issue) return null;
  return {
    patient_name,
    issue,
    clock_status: normalizeStatus(row.clock_status),
    last_activity: row.last_activity ? String(row.last_activity) : undefined,
  };
};

export function normalizeClockStartsStopsPage(raw: any): ClockStartsStopsPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource: any[] =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];

  const rows = rowsSource
    .map((row) => normalizeRow(row))
    .filter((row: ClockAnomalyRow | null): row is ClockAnomalyRow => Boolean(row))
    .sort((a: ClockAnomalyRow, b: ClockAnomalyRow) => {
      const al = String(a.last_activity || "");
      const bl = String(b.last_activity || "");
      if (al !== bl) return bl.localeCompare(al);
      return a.patient_name.localeCompare(b.patient_name);
    });

  const filtersRaw = payload?.filters ?? payload?.context ?? {};
  const filters = filtersRaw && typeof filtersRaw === "object"
    ? {
      specialty: filtersRaw.specialty ? String(filtersRaw.specialty) : undefined,
      consultant: filtersRaw.consultant ? String(filtersRaw.consultant) : undefined,
      site: filtersRaw.site ? String(filtersRaw.site) : undefined,
      from: filtersRaw.from ? String(filtersRaw.from) : (filtersRaw.date_from ? String(filtersRaw.date_from) : undefined),
      to: filtersRaw.to ? String(filtersRaw.to) : (filtersRaw.date_to ? String(filtersRaw.date_to) : undefined),
    }
    : undefined;

  const metrics = payload?.metrics && typeof payload.metrics === "object" ? payload.metrics : {};
  const tiles: Partial<Record<ClockTileKey, number>> = {
    clock_start_anomalies: metrics.clock_start_anomalies !== undefined ? toNumber(metrics.clock_start_anomalies) : undefined,
    suspended_clocks: metrics.suspended_clocks !== undefined ? toNumber(metrics.suspended_clocks) : undefined,
    stop_without_procedure: metrics.stop_without_procedure !== undefined ? toNumber(metrics.stop_without_procedure) : (metrics.stop_without_proc !== undefined ? toNumber(metrics.stop_without_proc) : undefined),
    duplicate_clocks: metrics.duplicate_clocks !== undefined ? toNumber(metrics.duplicate_clocks) : undefined,
    manual_overrides: metrics.manual_overrides !== undefined ? toNumber(metrics.manual_overrides) : undefined,
  };

  return {
    updated_at: payload?.updated_at ? String(payload.updated_at) : undefined,
    sources: Array.isArray(payload?.sources) ? payload.sources.map((s: unknown) => String(s)) : undefined,
    filters,
    tiles,
    rows,
  };
}
