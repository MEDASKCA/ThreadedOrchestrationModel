import type { ReferralManagementPage } from "./referrals";

export function isReferralQuery(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("referral") ||
    text.includes("triage") ||
    text.includes("awaiting triage") ||
    text.includes("overdue triage") ||
    text.includes("conversion rate") ||
    text.includes("new referrals")
  );
}

export function detectReferralQueryKind(message: string): "overdue_triage" | "awaiting_triage" | "new_referrals" | "conversion_rate" | "longest_waiting" | "unknown" {
  const text = String(message || "").toLowerCase();
  if (text.includes("overdue triage")) return "overdue_triage";
  if (text.includes("awaiting triage")) return "awaiting_triage";
  if (text.includes("new referral")) return "new_referrals";
  if (text.includes("conversion rate")) return "conversion_rate";
  if (text.includes("longest") || text.includes("waiting longest") || text.includes("waiting longest for triage")) return "longest_waiting";
  return "unknown";
}

export function pipelineCounts(page: ReferralManagementPage): {
  new_referrals?: number;
  awaiting_triage?: number;
  overdue_triage?: number;
  rejected_referrals?: number;
  conversion_rate?: number;
} {
  const out: {
    new_referrals?: number;
    awaiting_triage?: number;
    overdue_triage?: number;
    rejected_referrals?: number;
    conversion_rate?: number;
  } = {};
  if (typeof page.tiles.new_referrals === "number") out.new_referrals = page.tiles.new_referrals;
  if (typeof page.tiles.awaiting_triage === "number") out.awaiting_triage = page.tiles.awaiting_triage;
  if (typeof page.tiles.overdue_triage === "number") out.overdue_triage = page.tiles.overdue_triage;
  if (typeof page.tiles.rejected_referrals === "number") out.rejected_referrals = page.tiles.rejected_referrals;
  if (typeof page.tiles.conversion_rate === "number") out.conversion_rate = page.tiles.conversion_rate;
  return out;
}

export function longestWaitingReferral(page: ReferralManagementPage): { patient_name: string; waiting_days: number; specialty: string } | null {
  if (!page.rows.length) return null;
  const sorted = [...page.rows].sort((a, b) => {
    if (b.waiting_days !== a.waiting_days) return b.waiting_days - a.waiting_days;
    if (a.specialty !== b.specialty) return a.specialty.localeCompare(b.specialty);
    return a.patient_name.localeCompare(b.patient_name);
  });
  const top = sorted[0];
  if (!top) return null;
  return {
    patient_name: top.patient_name,
    waiting_days: top.waiting_days,
    specialty: top.specialty,
  };
}

export function referralsBySpecialty(page: ReferralManagementPage): Array<{ specialty: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of page.rows) {
    counts.set(row.specialty, (counts.get(row.specialty) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.specialty.localeCompare(b.specialty);
    });
}

export function summaryBullets(page: ReferralManagementPage): string[] {
  const bullets: string[] = [];
  if (typeof page.tiles.overdue_triage === "number") bullets.push(`Overdue triage: ${page.tiles.overdue_triage}`);
  if (typeof page.tiles.awaiting_triage === "number") bullets.push(`Awaiting triage: ${page.tiles.awaiting_triage}`);
  const longest = longestWaitingReferral(page);
  if (longest) bullets.push(`Longest referral wait: ${longest.patient_name} (${longest.waiting_days}d)`);
  return bullets.slice(0, 3);
}
