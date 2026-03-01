import type { PTLRow } from "./ptl";

export function countPatients(rows: PTLRow[]): number {
  return rows.length;
}

export function countByStatus(rows: PTLRow[]): Record<PTLRow["rtt_status"], number> {
  return rows.reduce(
    (acc, row) => {
      acc[row.rtt_status] += 1;
      return acc;
    },
    { on_track: 0, at_risk: 0, breaching: 0 } as Record<PTLRow["rtt_status"], number>,
  );
}

export function countBySpecialty(rows: PTLRow[]): Record<string, number> {
  return rows.reduce((acc, row) => {
    const key = row.specialty || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function findLongestWaiter(rows: PTLRow[]): PTLRow | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    if (b.waiting_days !== a.waiting_days) return b.waiting_days - a.waiting_days;
    return a.patient_name.localeCompare(b.patient_name);
  });
  return sorted[0] ?? null;
}

export function findBreaches(rows: PTLRow[]): PTLRow[] {
  return rows.filter((row) => row.rtt_status === "breaching");
}

export function findUrgentBreaches(rows: PTLRow[]): PTLRow[] {
  return rows.filter((row) => row.rtt_status === "breaching" && row.priority === "urgent");
}

export function groupByPriority(rows: PTLRow[]): Record<PTLRow["priority"], PTLRow[]> {
  return rows.reduce(
    (acc, row) => {
      acc[row.priority].push(row);
      return acc;
    },
    { urgent: [], routine: [], expedited: [] } as Record<PTLRow["priority"], PTLRow[]>,
  );
}

export type PTLQueryKind = "count" | "longest_waiter" | "breaches" | "urgent_breaches" | "rtt" | "unknown";

export function detectPtlQueryKind(message: string): PTLQueryKind {
  const text = String(message || "").toLowerCase();
  if (
    text.includes("longest waiter") ||
    text.includes("longest wait") ||
    text.includes("highest wait") ||
    text.includes("top waiter") ||
    text.includes("max wait")
  ) {
    return "longest_waiter";
  }
  if (text.includes("urgent breach") || text.includes("urgent breaches")) return "urgent_breaches";
  if (text.includes("breach")) return "breaches";
  if (text.includes("how many") || text.includes("count") || text.includes("how much") || text.includes("waiting")) return "count";
  if (text.includes("rtt")) return "rtt";
  return "unknown";
}

export function isPtlOperationalQuestion(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("ptl") ||
    text.includes("waiting list") ||
    text.includes("waiter") ||
    text.includes("rtt") ||
    text.includes("breach")
  );
}
