import type { Cancer2WWPage } from "./cancer-2ww";

export function isCancer2WWQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("2ww") ||
    text.includes("two week wait") ||
    text.includes("cancer pathways") ||
    text.includes("62 day") ||
    text.includes("62-day") ||
    text.includes("urgent cancer") ||
    text.includes("urgent diagnostics") ||
    text.includes("safety escalation") ||
    text.includes("safety escalations")
  );
}

export function detectCancer2WWQueryKind(message: string): "active_referrals" | "safety_escalations" | "urgent_diagnostics" | "breaches" | "compliance" | "unknown" {
  const text = String(message || "").toLowerCase();
  if (text.includes("safety escalation")) return "safety_escalations";
  if (text.includes("urgent diagnostics") || text.includes("urgent dx")) return "urgent_diagnostics";
  if (text.includes("breach")) return "breaches";
  if (text.includes("62 day") || text.includes("62-day") || text.includes("compliance")) return "compliance";
  if (text.includes("active") || text.includes("referral")) return "active_referrals";
  return "unknown";
}

export function activeReferrals(page: Cancer2WWPage): number | null {
  const tile = page.tiles.referrals_active_2ww;
  if (typeof tile === "number" && Number.isFinite(tile)) return tile;
  if (!page.rows.length) return null;
  return page.rows.reduce((sum, row) => sum + row.active_2ww, 0);
}

export function safetyEscalations(page: Cancer2WWPage): number | null {
  const tile = page.tiles.safety_escalations;
  return typeof tile === "number" && Number.isFinite(tile) ? tile : null;
}

export function urgentDiagnosticsPending(page: Cancer2WWPage): number | null {
  const tile = page.tiles.urgent_diagnostics_pending;
  if (typeof tile === "number" && Number.isFinite(tile)) return tile;
  if (!page.rows.length) return null;
  return page.rows.reduce((sum, row) => sum + row.urgent_dx_pending, 0);
}

export function totalBreaches(page: Cancer2WWPage): number | null {
  const tile = page.tiles.breaches_by_tumour_site;
  if (typeof tile === "number" && Number.isFinite(tile)) return tile;
  if (!page.rows.length) return null;
  return page.rows.reduce((sum, row) => sum + row.breaches, 0);
}

export function highestRiskSpecialties(page: Cancer2WWPage): Array<{ specialty: string; reason: string }> {
  const risks: Array<{ specialty: string; reason: string; rank: number }> = [];
  for (const row of page.rows) {
    if (row.breaches > 0) {
      risks.push({ specialty: row.specialty, reason: "breaches", rank: 1 });
    } else if (row.urgent_dx_pending > 0) {
      risks.push({ specialty: row.specialty, reason: "urgent_diagnostics_pending", rank: 2 });
    } else if (row.percent_within_62d < 50 && row.active_2ww > 0) {
      risks.push({ specialty: row.specialty, reason: "low_62d_compliance", rank: 3 });
    }
  }
  return risks
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.specialty.localeCompare(b.specialty);
    })
    .slice(0, 3)
    .map(({ specialty, reason }) => ({ specialty, reason }));
}

export function summaryBullets(page: Cancer2WWPage): string[] {
  const bullets: string[] = [];
  const active = activeReferrals(page);
  const breaches = totalBreaches(page);
  const urgentDx = urgentDiagnosticsPending(page);
  const escalations = safetyEscalations(page);
  if (active !== null) bullets.push(`Active 2WW referrals: ${active}`);
  if (breaches !== null) bullets.push(`Breaches shown: ${breaches}`);
  if (urgentDx !== null) bullets.push(`Urgent diagnostics pending: ${urgentDx}`);
  if (escalations !== null && bullets.length < 3) bullets.push(`Safety escalations: ${escalations}`);
  return bullets.slice(0, 3);
}
