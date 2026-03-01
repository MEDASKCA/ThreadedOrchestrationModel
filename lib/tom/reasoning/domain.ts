export type Domain = "app" | "general";

const APP_KEYWORD_RE =
  /\b(patient|patients|urgent|operations|logistics|planning|collaboration|intelligence|settings|ptl|rtt|waiting|waiting list|breach|breaches|high waiters|roster|shifts|inventory|stock|epr|opcs|session|sessions|theatre|clinic|pathway|pathway stages|milestones|bottleneck|flow|stage delay|clock start|clock stop|suspended clock|duplicate clock|manual override|data integrity|audit logs|validation|data quality|duplicate nhs|missing mandatory|no owner|ghost pathway|dna without rebook|backlog|metrics|specialty|escalation|thread|deliverables|task|worklist|capacity|ward|icu|cancer|2ww|two week wait|62 day|urgent diagnostics|referral|referrals|triage|conversion rate)\b/i;

const SECTION_COMMAND_RE =
  /\b(open|show)\s+(operations|logistics|planning|collaboration|intelligence|settings)\b/i;

export function detectDomain(message: string): Domain {
  const text = (message || "").toLowerCase();
  if (/\bwhat can you do\b/i.test(text)) return "app";
  if (APP_KEYWORD_RE.test(text)) return "app";
  if (SECTION_COMMAND_RE.test(text)) return "app";
  return "general";
}
