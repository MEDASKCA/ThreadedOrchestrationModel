export type BreachTileKey =
  | "breaches_by_specialty"
  | "breaches_by_cause"
  | "repeat_breach_cases"
  | "weekly_trend";

export type BreachRow = {
  patient_name: string;
  specialty: string;
  waiting_days: number;
  cause?: string;
  owner?: string;
};

export type BreachTrackingPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<BreachTileKey, number>>;
  rows: BreachRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeOwner = (value: unknown): string | undefined => {
  const text = String(value ?? "").trim();
  if (!text) return "unassigned";
  if (text.toLowerCase() === "unassigned") return "unassigned";
  return text;
};

const normalizeTiles = (raw: any): Partial<Record<BreachTileKey, number>> => {
  const base = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    breaches_by_specialty: base.breaches_by_specialty !== undefined ? toNumber(base.breaches_by_specialty) : undefined,
    breaches_by_cause: base.breaches_by_cause !== undefined ? toNumber(base.breaches_by_cause) : undefined,
    repeat_breach_cases: base.repeat_breach_cases !== undefined ? toNumber(base.repeat_breach_cases) : (base.repeat_breaches !== undefined ? toNumber(base.repeat_breaches) : undefined),
    weekly_trend: base.weekly_trend !== undefined ? toNumber(base.weekly_trend) : (base.trend_weekly !== undefined ? toNumber(base.trend_weekly) : undefined),
  };
};

const normalizeRow = (row: any): BreachRow | null => {
  if (!row || typeof row !== "object") return null;
  const patient_name = String(row.patient_name ?? row.patient ?? row.name ?? "").trim();
  const specialty = String(row.specialty ?? "").trim();
  if (!patient_name || !specialty) return null;
  return {
    patient_name,
    specialty,
    waiting_days: toNumber(row.waiting_days ?? row.waitingDays),
    cause: row.cause ? String(row.cause).trim() : undefined,
    owner: normalizeOwner(row.owner),
  };
};

export function normalizeBreachTrackingPage(raw: any): BreachTrackingPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];

  const rows = rowsSource
    .map((row: any) => normalizeRow(row))
    .filter((row: BreachRow | null): row is BreachRow => Boolean(row))
    .sort((a: BreachRow, b: BreachRow) => {
      if (b.waiting_days !== a.waiting_days) return b.waiting_days - a.waiting_days;
      if (a.specialty !== b.specialty) return a.specialty.localeCompare(b.specialty);
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

  return {
    updated_at: payload?.updated_at ? String(payload.updated_at) : undefined,
    sources: Array.isArray(payload?.sources) ? payload.sources.map((s: unknown) => String(s)) : undefined,
    filters,
    tiles: normalizeTiles(payload?.tiles ?? payload?.metrics ?? {}),
    rows,
  };
}
