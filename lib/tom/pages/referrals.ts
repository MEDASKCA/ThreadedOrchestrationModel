export type ReferralTileKey =
  | "new_referrals"
  | "awaiting_triage"
  | "overdue_triage"
  | "rejected_referrals"
  | "conversion_rate";

export type ReferralRow = {
  patient_name: string;
  specialty: string;
  consultant?: string;
  waiting_days: number;
  rtt_status?: "on_track" | "at_risk" | "breaching" | string;
};

export type ReferralManagementPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<ReferralTileKey, number>>;
  rows: ReferralRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeRttStatus = (value: unknown): string | undefined => {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return undefined;
  if (text.includes("breach")) return "breaching";
  if (text.includes("risk")) return "at_risk";
  if (text.includes("track")) return "on_track";
  return text.replace(/[\s-]+/g, "_");
};

const normalizeTiles = (raw: any): Partial<Record<ReferralTileKey, number>> => {
  const base = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    new_referrals: base.new_referrals !== undefined ? toNumber(base.new_referrals) : undefined,
    awaiting_triage: base.awaiting_triage !== undefined ? toNumber(base.awaiting_triage) : undefined,
    overdue_triage: base.overdue_triage !== undefined ? toNumber(base.overdue_triage) : undefined,
    rejected_referrals: base.rejected_referrals !== undefined ? toNumber(base.rejected_referrals) : (base.rejected !== undefined ? toNumber(base.rejected) : undefined),
    conversion_rate: base.conversion_rate !== undefined ? toNumber(base.conversion_rate) : undefined,
  };
};

const normalizeRow = (row: any): ReferralRow | null => {
  if (!row || typeof row !== "object") return null;
  const patient_name = String(row.patient_name ?? row.patient ?? row.name ?? "").trim();
  const specialty = String(row.specialty ?? "").trim();
  if (!patient_name || !specialty) return null;
  return {
    patient_name,
    specialty,
    consultant: row.consultant ? String(row.consultant).trim() : undefined,
    waiting_days: toNumber(row.waiting_days ?? row.waitingDays),
    rtt_status: normalizeRttStatus(row.rtt_status ?? row.status),
  };
};

export function normalizeReferralManagementPage(raw: any): ReferralManagementPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];
  const rows = rowsSource
    .map((row: any) => normalizeRow(row))
    .filter((row: ReferralRow | null): row is ReferralRow => Boolean(row))
    .sort((a: ReferralRow, b: ReferralRow) => {
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
