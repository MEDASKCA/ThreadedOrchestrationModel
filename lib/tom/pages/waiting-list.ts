export type WaitingListTileKey =
  | "total_waiting_list"
  | "average_waiting_time_days"
  | "slot_utilization_percent"
  | "decision_to_treat_to_booking_days"
  | "theatre_backlog_vs_sessions"
  | "capacity_gap_forecast";

export type WaitingListRow = {
  specialty: string;
  total_waiting: number;
  avg_wait_days: number;
  slot_util_percent: number;
  capacity_gap: number;
};

export type WaitingListManagementPage = {
  updated_at?: string;
  sources?: string[];
  filters?: { specialty?: string; consultant?: string; site?: string; from?: string; to?: string };
  tiles: Partial<Record<WaitingListTileKey, number>>;
  rows: WaitingListRow[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeTileRecord = (raw: any): Partial<Record<WaitingListTileKey, number>> => {
  const base = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    total_waiting_list: base.total_waiting_list !== undefined ? toNumber(base.total_waiting_list) : (base.total_waiting !== undefined ? toNumber(base.total_waiting) : undefined),
    average_waiting_time_days: base.average_waiting_time_days !== undefined ? toNumber(base.average_waiting_time_days) : (base.avg_wait !== undefined ? toNumber(base.avg_wait) : undefined),
    slot_utilization_percent: base.slot_utilization_percent !== undefined ? toNumber(base.slot_utilization_percent) : (base.slot_util !== undefined ? toNumber(base.slot_util) : undefined),
    decision_to_treat_to_booking_days: base.decision_to_treat_to_booking_days !== undefined ? toNumber(base.decision_to_treat_to_booking_days) : (base.dtt_to_booking !== undefined ? toNumber(base.dtt_to_booking) : undefined),
    theatre_backlog_vs_sessions: base.theatre_backlog_vs_sessions !== undefined ? toNumber(base.theatre_backlog_vs_sessions) : (base.theatre_backlog !== undefined ? toNumber(base.theatre_backlog) : undefined),
    capacity_gap_forecast: base.capacity_gap_forecast !== undefined ? toNumber(base.capacity_gap_forecast) : (base.capacity_gap !== undefined ? toNumber(base.capacity_gap) : undefined),
  };
};

const normalizeRow = (row: any): WaitingListRow | null => {
  if (!row || typeof row !== "object") return null;
  const specialty = String(row.specialty ?? "").trim();
  if (!specialty) return null;
  return {
    specialty,
    total_waiting: toNumber(row.total_waiting ?? row.total ?? row.waiting_total),
    avg_wait_days: toNumber(row.avg_wait_days ?? row.avg_wait ?? row.average_waiting_time_days),
    slot_util_percent: toNumber(row.slot_util_percent ?? row.slot_util ?? row.slot_utilization_percent),
    capacity_gap: toNumber(row.capacity_gap ?? row.capacity_gap_forecast ?? row.backlog_gap),
  };
};

export function normalizeWaitingListPage(raw: any): WaitingListManagementPage {
  const payload = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const rowsSource =
    (Array.isArray(payload?.rows) && payload.rows) ||
    (Array.isArray(payload?.table?.rows) && payload.table.rows) ||
    (Array.isArray(payload?.items) && payload.items) ||
    [];

  const rows = rowsSource
    .map((row: any) => normalizeRow(row))
    .filter((row: WaitingListRow | null): row is WaitingListRow => Boolean(row))
    .sort((a: WaitingListRow, b: WaitingListRow) => {
      if (b.total_waiting !== a.total_waiting) return b.total_waiting - a.total_waiting;
      if (b.avg_wait_days !== a.avg_wait_days) return b.avg_wait_days - a.avg_wait_days;
      return a.specialty.localeCompare(b.specialty);
    });

  const tiles = normalizeTileRecord(payload?.tiles ?? payload?.metrics ?? {});
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
    sources: Array.isArray(payload?.sources) ? payload.sources.map((item: unknown) => String(item)) : undefined,
    filters,
    tiles,
    rows,
  };
}
