export type RTTTileKey =
  | "percent_within_18w"
  | "breaches_52w"
  | "average_wait_days"
  | "median_wait_days"
  | "trend_12_weeks"
  | "forecast_breaches";

export type RTTRow = {
  specialty: string;
  percent_within_18w: number;
  breaches_52w: number;
  avg_wait_days: number;
  median_wait_days: number;
};

export type RTTMonitoringPage = {
  updated_at?: string;
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<RTTTileKey, number>>;
  rows: RTTRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

const normalizeTiles = (raw: any): Partial<Record<RTTTileKey, number>> => {
  const base = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    percent_within_18w: base.percent_within_18w !== undefined
      ? clampPercent(toNumber(base.percent_within_18w))
      : (base.within_18_weeks !== undefined ? clampPercent(toNumber(base.within_18_weeks)) : (base.within_18 !== undefined ? clampPercent(toNumber(base.within_18)) : undefined)),
    breaches_52w: base.breaches_52w !== undefined
      ? toNumber(base.breaches_52w)
      : (base.breach_52 !== undefined ? toNumber(base.breach_52) : undefined),
    average_wait_days: base.average_wait_days !== undefined
      ? toNumber(base.average_wait_days)
      : (base.avg_wait !== undefined ? toNumber(base.avg_wait) : undefined),
    median_wait_days: base.median_wait_days !== undefined
      ? toNumber(base.median_wait_days)
      : (base.median_wait !== undefined ? toNumber(base.median_wait) : undefined),
    trend_12_weeks: base.trend_12_weeks !== undefined
      ? toNumber(base.trend_12_weeks)
      : (base.trend_12w !== undefined ? toNumber(base.trend_12w) : undefined),
    forecast_breaches: base.forecast_breaches !== undefined ? toNumber(base.forecast_breaches) : undefined,
  };
};

const normalizeRow = (row: any): RTTRow | null => {
  if (!row || typeof row !== "object") return null;
  const specialty = String(row.specialty ?? "").trim();
  if (!specialty) return null;
  return {
    specialty,
    percent_within_18w: clampPercent(toNumber(row.percent_within_18w ?? row.within_18 ?? row.within_18_weeks)),
    breaches_52w: toNumber(row.breaches_52w ?? row.breach_52),
    avg_wait_days: toNumber(row.avg_wait_days ?? row.avg_wait),
    median_wait_days: toNumber(row.median_wait_days ?? row.median_wait),
  };
};

export function normalizeRTTPage(raw: any): RTTMonitoringPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];

  const rows = rowsSource
    .map((row: any) => normalizeRow(row))
    .filter((row: RTTRow | null): row is RTTRow => Boolean(row))
    .sort((a: RTTRow, b: RTTRow) => {
      if (a.percent_within_18w !== b.percent_within_18w) return a.percent_within_18w - b.percent_within_18w;
      if (b.breaches_52w !== a.breaches_52w) return b.breaches_52w - a.breaches_52w;
      return a.specialty.localeCompare(b.specialty);
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
    filters,
    tiles: normalizeTiles(payload?.tiles ?? payload?.metrics ?? {}),
    rows,
  };
}
