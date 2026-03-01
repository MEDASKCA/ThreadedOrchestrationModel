export type Cancer2WWTileKey =
  | "referrals_active_2ww"
  | "compliance_62d"
  | "breaches_by_tumour_site"
  | "urgent_diagnostics_pending"
  | "safety_escalations";

export type Cancer2WWRow = {
  specialty: string;
  active_2ww: number;
  percent_within_62d: number;
  urgent_dx_pending: number;
  breaches: number;
};

export type Cancer2WWPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<Cancer2WWTileKey, number>>;
  rows: Cancer2WWRow[];
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

const normalizeTiles = (raw: any): Partial<Record<Cancer2WWTileKey, number>> => {
  const base = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    referrals_active_2ww: base.referrals_active_2ww !== undefined ? toNumber(base.referrals_active_2ww) : (base.active_2ww !== undefined ? toNumber(base.active_2ww) : undefined),
    compliance_62d: base.compliance_62d !== undefined ? clampPercent(toNumber(base.compliance_62d)) : (base.compliance !== undefined ? clampPercent(toNumber(base.compliance)) : undefined),
    breaches_by_tumour_site: base.breaches_by_tumour_site !== undefined ? toNumber(base.breaches_by_tumour_site) : (base.breaches !== undefined ? toNumber(base.breaches) : undefined),
    urgent_diagnostics_pending: base.urgent_diagnostics_pending !== undefined ? toNumber(base.urgent_diagnostics_pending) : (base.urgent_dx_pending !== undefined ? toNumber(base.urgent_dx_pending) : undefined),
    safety_escalations: base.safety_escalations !== undefined ? toNumber(base.safety_escalations) : undefined,
  };
};

const normalizeRow = (row: any): Cancer2WWRow | null => {
  if (!row || typeof row !== "object") return null;
  const specialty = String(row.specialty ?? "").trim();
  if (!specialty) return null;
  return {
    specialty,
    active_2ww: toNumber(row.active_2ww ?? row.active),
    percent_within_62d: clampPercent(toNumber(row.percent_within_62d ?? row.compliance)),
    urgent_dx_pending: toNumber(row.urgent_dx_pending ?? row.urgent_dx),
    breaches: toNumber(row.breaches),
  };
};

export function normalizeCancer2WWPage(raw: any): Cancer2WWPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];

  const rows = rowsSource
    .map((row: any) => normalizeRow(row))
    .filter((row: Cancer2WWRow | null): row is Cancer2WWRow => Boolean(row))
    .sort((a: Cancer2WWRow, b: Cancer2WWRow) => {
      if (b.breaches !== a.breaches) return b.breaches - a.breaches;
      if (b.urgent_dx_pending !== a.urgent_dx_pending) return b.urgent_dx_pending - a.urgent_dx_pending;
      if (b.active_2ww !== a.active_2ww) return b.active_2ww - a.active_2ww;
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
    sources: Array.isArray(payload?.sources) ? payload.sources.map((s: unknown) => String(s)) : undefined,
    filters,
    tiles: normalizeTiles(payload?.tiles ?? payload?.metrics ?? {}),
    rows,
  };
}
