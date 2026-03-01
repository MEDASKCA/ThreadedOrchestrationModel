export type PathwayStageRow = {
  stage: string;
  count: number;
  avg_wait_days: number;
};

export type PathwayMilestonesPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles?: {
    stage_distribution?: number;
    average_days_between_stages?: number;
    bottleneck_heatmap?: number;
  };
  rows: PathwayStageRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeRow = (row: any): PathwayStageRow | null => {
  if (!row || typeof row !== "object") return null;
  const stage = String(row.stage ?? "").trim().toLowerCase();
  if (!stage) return null;
  return {
    stage,
    count: toNumber(row.count),
    avg_wait_days: toNumber(row.avg_wait_days ?? row.avg_wait),
  };
};

export function normalizePathwayMilestonesPage(raw: any): PathwayMilestonesPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource: any[] =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];
  const rows = rowsSource
    .map((row: any) => normalizeRow(row))
    .filter((row: PathwayStageRow | null): row is PathwayStageRow => Boolean(row))
    .sort((a: PathwayStageRow, b: PathwayStageRow) => {
      if (b.avg_wait_days !== a.avg_wait_days) return b.avg_wait_days - a.avg_wait_days;
      if (b.count !== a.count) return b.count - a.count;
      return a.stage.localeCompare(b.stage);
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
  const tiles = {
    stage_distribution: metrics.stage_distribution !== undefined ? toNumber(metrics.stage_distribution) : undefined,
    average_days_between_stages: metrics.average_days_between_stages !== undefined ? toNumber(metrics.average_days_between_stages) : (metrics.avg_stage_gap !== undefined ? toNumber(metrics.avg_stage_gap) : undefined),
    bottleneck_heatmap: metrics.bottleneck_heatmap !== undefined ? toNumber(metrics.bottleneck_heatmap) : (metrics.bottlenecks !== undefined ? toNumber(metrics.bottlenecks) : undefined),
  };

  return {
    updated_at: payload?.updated_at ? String(payload.updated_at) : undefined,
    sources: Array.isArray(payload?.sources) ? payload.sources.map((s: unknown) => String(s)) : undefined,
    filters,
    tiles,
    rows,
  };
}
