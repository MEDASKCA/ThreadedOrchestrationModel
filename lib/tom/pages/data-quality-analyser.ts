import type { DataQualityRow, DataQualityTileKey, ValidationDataQualityPage } from "./data-quality";

export function isDataQualityQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("validation") ||
    text.includes("data quality") ||
    text.includes("duplicate nhs") ||
    text.includes("missing mandatory") ||
    text.includes("no owner") ||
    text.includes("ghost pathway") ||
    text.includes("dna without rebook") ||
    text.includes("data hygiene")
  );
}

export function detectDataQualityQueryKind(message: string): "no_owner" | "duplicate_nhs" | "validation_overdue" | "ghost_pathways" | "unknown" {
  const text = String(message || "").toLowerCase();
  if (text.includes("no owner") || text.includes("who has no owner")) return "no_owner";
  if (text.includes("duplicate nhs")) return "duplicate_nhs";
  if (text.includes("validation overdue")) return "validation_overdue";
  if (text.includes("ghost pathway")) return "ghost_pathways";
  return "unknown";
}

export function issueCounts(page: ValidationDataQualityPage): Partial<Record<DataQualityTileKey, number>> {
  const out: Partial<Record<DataQualityTileKey, number>> = {};
  for (const [key, value] of Object.entries(page.tiles)) {
    if (typeof value === "number") out[key as DataQualityTileKey] = value;
  }
  return out;
}

export function totalIssueRows(page: ValidationDataQualityPage): number {
  return page.rows.length;
}

export function unassignedRecords(page: ValidationDataQualityPage): DataQualityRow[] {
  return page.rows.filter((row) => String(row.owner || "").trim().toLowerCase() === "unassigned" || String(row.owner || "").trim().length === 0);
}

export function mostRecentIssues(page: ValidationDataQualityPage, limit = 3): DataQualityRow[] {
  return [...page.rows]
    .sort((a, b) => String(b.last_activity || "").localeCompare(String(a.last_activity || "")))
    .slice(0, Math.max(0, limit));
}

export function summaryBullets(page: ValidationDataQualityPage): string[] {
  const counts = issueCounts(page);
  const recent = mostRecentIssues(page, 1)[0];
  const bullets: string[] = [];
  if (typeof counts.validation_overdue === "number") bullets.push(`Validation overdue: ${counts.validation_overdue}`);
  if (typeof counts.never_validated === "number") bullets.push(`Never validated: ${counts.never_validated}`);
  if (typeof counts.no_owner_assigned === "number") bullets.push(`No owner assigned: ${counts.no_owner_assigned}`);
  if (recent) bullets.push(`Most recent issue: ${recent.patient_name} - ${recent.issue}`);
  return bullets.slice(0, 4);
}
