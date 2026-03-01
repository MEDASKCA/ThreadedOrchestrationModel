export type TriageTileKey =
  | "awaiting_consultant_review"
  | "overdue_triage"
  | "clarification_requested"
  | "reprioritization_pending";

export type TriageRow = {
  patient_name: string;
  consultant?: string;
  waiting_days: number;
  priority?: "urgent" | "soon" | "routine" | string;
  rtt_status?: "on_track" | "at_risk" | "breaching" | string;
  state?: "awaiting_consultant_review" | "overdue_triage" | "clarification_requested" | "reprioritization_pending" | string;
};

export type TriageStatusPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<TriageTileKey, number>>;
  rows: TriageRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeEnumLike = (value: unknown): string | undefined => {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return undefined;
  return text.replace(/[\s-]+/g, "_");
};

const normalizeRttStatus = (value: unknown): TriageRow["rtt_status"] => {
  const text = normalizeEnumLike(value);
  if (!text) return undefined;
  if (text.includes("breach")) return "breaching";
  if (text.includes("risk")) return "at_risk";
  if (text.includes("track")) return "on_track";
  return text;
};

const normalizePriority = (value: unknown): TriageRow["priority"] => {
  const text = normalizeEnumLike(value);
  if (!text) return undefined;
  if (text.includes("urgent")) return "urgent";
  if (text.includes("soon")) return "soon";
  if (text.includes("routine")) return "routine";
  return text;
};

const normalizeState = (value: unknown): TriageRow["state"] => {
  const text = normalizeEnumLike(value);
  if (!text) return undefined;
  if (text.includes("awaiting") && text.includes("review")) return "awaiting_consultant_review";
  if (text.includes("overdue") && text.includes("triage")) return "overdue_triage";
  if (text.includes("clarification")) return "clarification_requested";
  if (text.includes("repriorit")) return "reprioritization_pending";
  return text;
};

const normalizeTiles = (raw: any): Partial<Record<TriageTileKey, number>> => {
  const base = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    awaiting_consultant_review:
      base.awaiting_consultant_review !== undefined
        ? toNumber(base.awaiting_consultant_review)
        : (base.awaiting_review !== undefined ? toNumber(base.awaiting_review) : undefined),
    overdue_triage: base.overdue_triage !== undefined ? toNumber(base.overdue_triage) : undefined,
    clarification_requested:
      base.clarification_requested !== undefined
        ? toNumber(base.clarification_requested)
        : (base.clarification !== undefined ? toNumber(base.clarification) : undefined),
    reprioritization_pending:
      base.reprioritization_pending !== undefined
        ? toNumber(base.reprioritization_pending)
        : (base.reprioritization !== undefined ? toNumber(base.reprioritization) : undefined),
  };
};

const normalizeRow = (row: any): TriageRow | null => {
  if (!row || typeof row !== "object") return null;
  const patient_name = String(row.patient_name ?? row.patient ?? row.name ?? "").trim();
  if (!patient_name) return null;
  return {
    patient_name,
    consultant: row.consultant ? String(row.consultant).trim() : undefined,
    waiting_days: toNumber(row.waiting_days ?? row.waitingDays),
    priority: normalizePriority(row.priority),
    rtt_status: normalizeRttStatus(row.rtt_status ?? row.status),
    state: normalizeState(row.state),
  };
};

export function normalizeTriageStatusPage(raw: any): TriageStatusPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];

  const rows = rowsSource
    .map((row: any) => normalizeRow(row))
    .filter((row: TriageRow | null): row is TriageRow => Boolean(row))
    .sort((a: TriageRow, b: TriageRow) => {
      if (b.waiting_days !== a.waiting_days) return b.waiting_days - a.waiting_days;
      if ((a.priority || "") !== (b.priority || "")) return String(a.priority || "").localeCompare(String(b.priority || ""));
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
