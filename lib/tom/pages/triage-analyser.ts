import type { TriageRow, TriageStatusPage, TriageTileKey } from "./triage";

export function isTriageQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("triage") ||
    text.includes("awaiting consultant review") ||
    text.includes("overdue triage") ||
    text.includes("clarification requested") ||
    text.includes("reprioritization") ||
    text.includes("reprioritisation") ||
    text.includes("decision queue")
  );
}

export function detectTriageQueryKind(message: string): "overdue" | "awaiting_review" | "clarification_requested" | "reprioritization" | "who_overdue" | "longest_waiting" | "urgent" | "at_risk" | "unknown" {
  const text = String(message || "").toLowerCase();
  if (text.includes("who is overdue") || text.includes("who's overdue")) return "who_overdue";
  if (text.includes("overdue triage")) return "overdue";
  if (text.includes("awaiting consultant review")) return "awaiting_review";
  if (text.includes("clarification requested")) return "clarification_requested";
  if (text.includes("reprioritization") || text.includes("reprioritisation")) return "reprioritization";
  if (text.includes("longest") || text.includes("waiting longest")) return "longest_waiting";
  if (text.includes("urgent")) return "urgent";
  if (text.includes("at risk") || text.includes("at_risk")) return "at_risk";
  return "unknown";
}

export function queueCounts(page: TriageStatusPage): Partial<Record<TriageTileKey, number>> {
  const out: Partial<Record<TriageTileKey, number>> = {};
  if (typeof page.tiles.awaiting_consultant_review === "number") out.awaiting_consultant_review = page.tiles.awaiting_consultant_review;
  if (typeof page.tiles.overdue_triage === "number") out.overdue_triage = page.tiles.overdue_triage;
  if (typeof page.tiles.clarification_requested === "number") out.clarification_requested = page.tiles.clarification_requested;
  if (typeof page.tiles.reprioritization_pending === "number") out.reprioritization_pending = page.tiles.reprioritization_pending;
  return out;
}

export function longestWaiting(page: TriageStatusPage): { patient_name: string; waiting_days: number; consultant?: string } | null {
  if (!page.rows.length) return null;
  const sorted = [...page.rows].sort((a, b) => {
    if (b.waiting_days !== a.waiting_days) return b.waiting_days - a.waiting_days;
    return a.patient_name.localeCompare(b.patient_name);
  });
  const top = sorted[0];
  return top ? { patient_name: top.patient_name, waiting_days: top.waiting_days, consultant: top.consultant } : null;
}

export function urgentItems(page: TriageStatusPage): TriageRow[] {
  return page.rows.filter((row) => row.priority === "urgent");
}

export function atRiskItems(page: TriageStatusPage): TriageRow[] {
  return page.rows.filter((row) => row.rtt_status === "at_risk");
}

export function summaryBullets(page: TriageStatusPage): string[] {
  const bullets: string[] = [];
  if (typeof page.tiles.awaiting_consultant_review === "number") bullets.push(`Awaiting consultant review: ${page.tiles.awaiting_consultant_review}`);
  if (typeof page.tiles.overdue_triage === "number") bullets.push(`Overdue triage: ${page.tiles.overdue_triage}`);
  const oldest = longestWaiting(page);
  if (oldest) bullets.push(`Oldest pending item: ${oldest.patient_name} (${oldest.waiting_days}d)`);
  return bullets.slice(0, 3);
}
