import type { ClockAnomalyRow, ClockStartsStopsPage, ClockTileKey } from "./clock-events";

export function isClockEventsQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("clock start") ||
    text.includes("clock stop") ||
    text.includes("suspended clock") ||
    text.includes("duplicate clock") ||
    text.includes("manual override") ||
    text.includes("audit log") ||
    text.includes("audit logs") ||
    text.includes("data integrity") ||
    text.includes("missing clock start")
  );
}

export function detectClockEventsQueryKind(message: string): "manual_overrides" | "missing_clock_start" | "duplicate_clocks" | "suspended" | "unknown" {
  const text = String(message || "").toLowerCase();
  if (text.includes("manual override")) return "manual_overrides";
  if (text.includes("missing clock start")) return "missing_clock_start";
  if (text.includes("duplicate clock")) return "duplicate_clocks";
  if (text.includes("suspended clock")) return "suspended";
  return "unknown";
}

export function anomalyCounts(page: ClockStartsStopsPage): Partial<Record<ClockTileKey, number>> {
  const out: Partial<Record<ClockTileKey, number>> = {};
  if (typeof page.tiles.clock_start_anomalies === "number") out.clock_start_anomalies = page.tiles.clock_start_anomalies;
  if (typeof page.tiles.suspended_clocks === "number") out.suspended_clocks = page.tiles.suspended_clocks;
  if (typeof page.tiles.stop_without_procedure === "number") out.stop_without_procedure = page.tiles.stop_without_procedure;
  if (typeof page.tiles.duplicate_clocks === "number") out.duplicate_clocks = page.tiles.duplicate_clocks;
  if (typeof page.tiles.manual_overrides === "number") out.manual_overrides = page.tiles.manual_overrides;
  return out;
}

export function totalAnomalyRows(page: ClockStartsStopsPage): number {
  return page.rows.length;
}

export function mostRecentAnomalies(page: ClockStartsStopsPage, limit = 3): ClockAnomalyRow[] {
  return [...page.rows]
    .sort((a, b) => String(b.last_activity || "").localeCompare(String(a.last_activity || "")))
    .slice(0, Math.max(0, limit));
}

export function summaryBullets(page: ClockStartsStopsPage): string[] {
  const counts = anomalyCounts(page);
  const recent = mostRecentAnomalies(page, 1)[0];
  const bullets: string[] = [];
  if (typeof counts.clock_start_anomalies === "number") bullets.push(`Clock start anomalies: ${counts.clock_start_anomalies}`);
  if (typeof counts.manual_overrides === "number") bullets.push(`Manual overrides: ${counts.manual_overrides}`);
  if (typeof counts.duplicate_clocks === "number") bullets.push(`Duplicate clocks: ${counts.duplicate_clocks}`);
  if (recent) bullets.push(`Most recent issue: ${recent.patient_name} - ${recent.issue}`);
  return bullets.slice(0, 4);
}
