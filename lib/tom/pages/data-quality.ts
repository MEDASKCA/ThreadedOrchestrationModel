export type DataQualityTileKey =
  | "validation_overdue"
  | "never_validated"
  | "dna_without_rebook"
  | "no_owner_assigned"
  | "duplicate_nhs_numbers"
  | "missing_mandatory_fields"
  | "no_recent_contact"
  | "ghost_pathways";

export type DataQualityRow = {
  patient_name: string;
  issue: string;
  last_activity?: string;
  owner?: string;
};

export type ValidationDataQualityPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<DataQualityTileKey, number>>;
  rows: DataQualityRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeOwner = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (!text) return "unassigned";
  if (text.toLowerCase() === "unassigned") return "unassigned";
  return text;
};

const normalizeRow = (row: any): DataQualityRow | null => {
  if (!row || typeof row !== "object") return null;
  const patient_name = String(row.patient_name ?? row.patient ?? row.name ?? "").trim();
  const issue = String(row.issue ?? "").trim();
  if (!patient_name || !issue) return null;
  return {
    patient_name,
    issue,
    last_activity: row.last_activity ? String(row.last_activity) : undefined,
    owner: normalizeOwner(row.owner),
  };
};

export function normalizeValidationDataQualityPage(raw: any): ValidationDataQualityPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource: any[] =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];

  const rows = rowsSource
    .map((row) => normalizeRow(row))
    .filter((row: DataQualityRow | null): row is DataQualityRow => Boolean(row))
    .sort((a: DataQualityRow, b: DataQualityRow) => String(b.last_activity || "").localeCompare(String(a.last_activity || "")));

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
  const tiles: Partial<Record<DataQualityTileKey, number>> = {
    validation_overdue: metrics.validation_overdue !== undefined ? toNumber(metrics.validation_overdue) : undefined,
    never_validated: metrics.never_validated !== undefined ? toNumber(metrics.never_validated) : undefined,
    dna_without_rebook: metrics.dna_without_rebook !== undefined ? toNumber(metrics.dna_without_rebook) : (metrics.dna_no_rebook !== undefined ? toNumber(metrics.dna_no_rebook) : undefined),
    no_owner_assigned: metrics.no_owner_assigned !== undefined ? toNumber(metrics.no_owner_assigned) : (metrics.no_owner !== undefined ? toNumber(metrics.no_owner) : undefined),
    duplicate_nhs_numbers: metrics.duplicate_nhs_numbers !== undefined ? toNumber(metrics.duplicate_nhs_numbers) : (metrics.duplicate_nhs !== undefined ? toNumber(metrics.duplicate_nhs) : undefined),
    missing_mandatory_fields: metrics.missing_mandatory_fields !== undefined ? toNumber(metrics.missing_mandatory_fields) : (metrics.missing_fields !== undefined ? toNumber(metrics.missing_fields) : undefined),
    no_recent_contact: metrics.no_recent_contact !== undefined ? toNumber(metrics.no_recent_contact) : (metrics.no_contact !== undefined ? toNumber(metrics.no_contact) : undefined),
    ghost_pathways: metrics.ghost_pathways !== undefined ? toNumber(metrics.ghost_pathways) : undefined,
  };

  return {
    updated_at: payload?.updated_at ? String(payload.updated_at) : undefined,
    sources: Array.isArray(payload?.sources) ? payload.sources.map((s: unknown) => String(s)) : undefined,
    filters,
    tiles,
    rows,
  };
}
