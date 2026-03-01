import type { WaitingListManagementPage } from "./waiting-list";

export type WaitingListQueryKind =
  | "total_waiting"
  | "max_avg_wait"
  | "max_waiting_volume"
  | "capacity_gap"
  | "unknown";

export function detectWaitingListQueryKind(message: string): WaitingListQueryKind {
  const text = String(message || "").toLowerCase();
  if (text.includes("capacity gap") || text.includes("capacity") || text.includes("backlog") || text.includes("queue")) {
    return "capacity_gap";
  }
  if (
    text.includes("which specialty has the longest wait") ||
    text.includes("specialty longest wait") ||
    text.includes("max average wait") ||
    text.includes("highest average wait")
  ) {
    return "max_avg_wait";
  }
  if (
    text.includes("which specialty has the most waiting") ||
    text.includes("largest backlog by volume") ||
    text.includes("most waiting")
  ) {
    return "max_waiting_volume";
  }
  if (
    text.includes("how many are waiting") ||
    text.includes("how many waiting") ||
    text.includes("total waiting") ||
    text.includes("waiting list total") ||
    text.includes("how many on the waiting list")
  ) {
    return "total_waiting";
  }
  return "unknown";
}

export function isWaitingListMacroQuestion(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("waiting list") ||
    text.includes("queue") ||
    text.includes("backlog") ||
    text.includes("capacity gap") ||
    text.includes("slot utilization") ||
    text.includes("slot utilisation") ||
    detectWaitingListQueryKind(text) !== "unknown"
  );
}

export function totalWaiting(page: WaitingListManagementPage): number | null {
  const tileValue = page.tiles.total_waiting_list;
  if (typeof tileValue === "number" && Number.isFinite(tileValue)) return tileValue;
  if (!page.rows.length) return null;
  return page.rows.reduce((sum, row) => sum + row.total_waiting, 0);
}

export function specialtyWithMaxAvgWait(page: WaitingListManagementPage): { specialty: string; avg_wait_days: number } | null {
  if (!page.rows.length) return null;
  const sorted = [...page.rows].sort((a, b) => {
    if (b.avg_wait_days !== a.avg_wait_days) return b.avg_wait_days - a.avg_wait_days;
    if (b.total_waiting !== a.total_waiting) return b.total_waiting - a.total_waiting;
    return a.specialty.localeCompare(b.specialty);
  });
  const top = sorted[0];
  return top ? { specialty: top.specialty, avg_wait_days: top.avg_wait_days } : null;
}

export function specialtyWithMaxWaiting(page: WaitingListManagementPage): { specialty: string; total_waiting: number } | null {
  if (!page.rows.length) return null;
  const sorted = [...page.rows].sort((a, b) => {
    if (b.total_waiting !== a.total_waiting) return b.total_waiting - a.total_waiting;
    if (b.avg_wait_days !== a.avg_wait_days) return b.avg_wait_days - a.avg_wait_days;
    return a.specialty.localeCompare(b.specialty);
  });
  const top = sorted[0];
  return top ? { specialty: top.specialty, total_waiting: top.total_waiting } : null;
}

export function specialtiesWithCapacityGap(page: WaitingListManagementPage): Array<{ specialty: string; capacity_gap: number }> {
  return page.rows
    .filter((row) => row.capacity_gap > 0)
    .sort((a, b) => {
      if (b.capacity_gap !== a.capacity_gap) return b.capacity_gap - a.capacity_gap;
      if (b.total_waiting !== a.total_waiting) return b.total_waiting - a.total_waiting;
      return a.specialty.localeCompare(b.specialty);
    })
    .map((row) => ({ specialty: row.specialty, capacity_gap: row.capacity_gap }));
}

export function summarizeTopSignals(page: WaitingListManagementPage): string[] {
  const signals: string[] = [];
  const maxAvgWait = specialtyWithMaxAvgWait(page);
  if (maxAvgWait) {
    signals.push(`Highest average wait: ${maxAvgWait.specialty} (${maxAvgWait.avg_wait_days}d)`);
  }
  const maxWaiting = specialtyWithMaxWaiting(page);
  if (maxWaiting) {
    signals.push(`Largest backlog by volume: ${maxWaiting.specialty} (${maxWaiting.total_waiting})`);
  }
  const gaps = specialtiesWithCapacityGap(page);
  if (gaps.length > 0) {
    signals.push(`Capacity gaps present in: ${gaps.map((item) => item.specialty).join(", ")}`);
  }
  return signals;
}
