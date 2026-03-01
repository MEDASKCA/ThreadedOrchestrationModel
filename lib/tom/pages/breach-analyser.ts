import type { BreachRow, BreachTrackingPage } from "./breach-tracking";

export function isBreachTrackingQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("breach") ||
    text.includes("breaches") ||
    text.includes("repeat breach") ||
    text.includes("breach cause") ||
    text.includes("breach owner") ||
    text.includes("breach trend") ||
    text.includes("who is breaching")
  );
}

export function detectBreachQueryKind(message: string): "who" | "repeat" | "causes" | "ownership" | "trend" | "count" | "unknown" {
  const text = String(message || "").toLowerCase();
  if (text.includes("who is breaching") || text.includes("who is breaching the longest")) return "who";
  if (text.includes("repeat breach")) return "repeat";
  if (text.includes("why are we breaching") || text.includes("breach cause") || text.includes("causes")) return "causes";
  if (text.includes("owner") || text.includes("ownership") || text.includes("unassigned")) return "ownership";
  if (text.includes("trend")) return "trend";
  if (text.includes("how many breach") || text.includes("how many breaches") || text.includes("any breaches")) return "count";
  return "unknown";
}

export function totalBreaches(page: BreachTrackingPage): number {
  return page.rows.length;
}

export function longestBreach(page: BreachTrackingPage): BreachRow | null {
  if (!page.rows.length) return null;
  return [...page.rows].sort((a, b) => {
    if (b.waiting_days !== a.waiting_days) return b.waiting_days - a.waiting_days;
    if (a.specialty !== b.specialty) return a.specialty.localeCompare(b.specialty);
    return a.patient_name.localeCompare(b.patient_name);
  })[0] ?? null;
}

export function breachesBySpecialty(page: BreachTrackingPage): Array<{ specialty: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of page.rows) counts.set(row.specialty, (counts.get(row.specialty) || 0) + 1);
  return Array.from(counts.entries())
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => (b.count - a.count) || a.specialty.localeCompare(b.specialty));
}

export function breachesByCause(page: BreachTrackingPage): Array<{ cause: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of page.rows) {
    if (!row.cause || !row.cause.trim()) continue;
    const cause = row.cause.trim();
    counts.set(cause, (counts.get(cause) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => (b.count - a.count) || a.cause.localeCompare(b.cause));
}

export function unassignedBreaches(page: BreachTrackingPage): BreachRow[] {
  return page.rows.filter((row) => {
    const owner = String(row.owner || "").trim().toLowerCase();
    return owner.length === 0 || owner === "unassigned";
  });
}

export function summaryBullets(page: BreachTrackingPage): string[] {
  const total = totalBreaches(page);
  const longest = longestBreach(page);
  const unassigned = unassignedBreaches(page);
  const causes = breachesByCause(page);
  const bullets: string[] = [
    `Total breaches: ${total}`,
  ];
  if (longest) bullets.push(`Longest breach: ${longest.patient_name} (${longest.waiting_days}d)`);
  bullets.push(`Unassigned breaches: ${unassigned.length}`);
  if (causes.length > 0) bullets.push(`Top cause: ${causes[0].cause}`);
  return bullets.slice(0, 4);
}
