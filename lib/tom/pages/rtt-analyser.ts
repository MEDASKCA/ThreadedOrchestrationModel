import type { RTTMonitoringPage } from "./rtt";

export function isRttComplianceQuestion(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("rtt") ||
    text.includes("18 week") ||
    text.includes("18-week") ||
    text.includes("52 week") ||
    text.includes("52-week") ||
    text.includes("within target") ||
    text.includes("within 18") ||
    text.includes("compliance") ||
    text.includes("compliant") ||
    text.includes("breach")
  );
}

export function overallCompliance(page: RTTMonitoringPage): number | null {
  const tile = page.tiles.percent_within_18w;
  if (typeof tile === "number" && Number.isFinite(tile)) return tile;
  if (!page.rows.length) return null;
  const average = page.rows.reduce((sum, row) => sum + row.percent_within_18w, 0) / page.rows.length;
  return Math.round(average);
}

export function specialtiesBelowThreshold(page: RTTMonitoringPage, threshold = 50): Array<{ specialty: string; percent_within_18w: number }> {
  return page.rows
    .filter((row) => row.percent_within_18w < threshold)
    .sort((a, b) => {
      if (a.percent_within_18w !== b.percent_within_18w) return a.percent_within_18w - b.percent_within_18w;
      if (b.breaches_52w !== a.breaches_52w) return b.breaches_52w - a.breaches_52w;
      return a.specialty.localeCompare(b.specialty);
    })
    .map((row) => ({ specialty: row.specialty, percent_within_18w: row.percent_within_18w }));
}

export function specialtyWithMostBreaches(page: RTTMonitoringPage): { specialty: string; breaches_52w: number } | null {
  if (!page.rows.length) return null;
  const sorted = [...page.rows].sort((a, b) => {
    if (b.breaches_52w !== a.breaches_52w) return b.breaches_52w - a.breaches_52w;
    if (a.percent_within_18w !== b.percent_within_18w) return a.percent_within_18w - b.percent_within_18w;
    return a.specialty.localeCompare(b.specialty);
  });
  const top = sorted[0];
  return top ? { specialty: top.specialty, breaches_52w: top.breaches_52w } : null;
}

export function specialtyWithLowestCompliance(page: RTTMonitoringPage): { specialty: string; percent_within_18w: number } | null {
  if (!page.rows.length) return null;
  const sorted = [...page.rows].sort((a, b) => {
    if (a.percent_within_18w !== b.percent_within_18w) return a.percent_within_18w - b.percent_within_18w;
    if (b.breaches_52w !== a.breaches_52w) return b.breaches_52w - a.breaches_52w;
    return a.specialty.localeCompare(b.specialty);
  });
  const top = sorted[0];
  return top ? { specialty: top.specialty, percent_within_18w: top.percent_within_18w } : null;
}

export function complianceSummary(page: RTTMonitoringPage): string[] {
  const lines: string[] = [];
  const overall = overallCompliance(page);
  if (overall !== null) {
    lines.push(`Overall within 18 weeks: ${overall}%`);
  }
  const lowest = specialtyWithLowestCompliance(page);
  if (lowest) {
    lines.push(`Lowest compliance specialty: ${lowest.specialty} (${lowest.percent_within_18w}%)`);
  }
  const mostBreaches = specialtyWithMostBreaches(page);
  if (mostBreaches) {
    lines.push(`Highest 52-week breaches: ${mostBreaches.specialty} (${mostBreaches.breaches_52w})`);
  }
  if (typeof page.tiles.forecast_breaches === "number" && Number.isFinite(page.tiles.forecast_breaches)) {
    lines.push(`Forecast breaches: ${page.tiles.forecast_breaches}`);
  }
  return lines;
}
