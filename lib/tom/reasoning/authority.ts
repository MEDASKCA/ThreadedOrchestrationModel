import type { TomIntent } from "@/lib/tom/reasoning/intent";

export type AuthorityDomain =
  | "epr"
  | "access_pathways"
  | "roster"
  | "inventory"
  | "opcs"
  | "comms"
  | "governance"
  | "unknown";

export interface AuthorityRule {
  domain: AuthorityDomain;
  tools: string[];
  priority: number;
  notes?: string;
}

export const AUTHORITY_RULES: AuthorityRule[] = [
  {
    domain: "epr",
    tools: ["epr.ptl_summary"],
    priority: 100,
    notes: "Primary patient tracking and waiting list authority.",
  },
  {
    domain: "access_pathways",
    tools: ["pas.referrals_summary"],
    priority: 90,
    notes: "Referral intake and pathway-level access signal.",
  },
  {
    domain: "roster",
    tools: ["roster.staffing_summary"],
    priority: 95,
    notes: "Workforce and rota authority.",
  },
  {
    domain: "governance",
    tools: ["alerts.active", "anomalies.open"],
    priority: 85,
    notes: "Risk and oversight signals.",
  },
  {
    domain: "comms",
    tools: ["comms.summary"],
    priority: 70,
    notes: "Communication context signal.",
  },
];

const INTENT_AUTHORITY_MAP: Record<TomIntent, AuthorityDomain> = {
  smalltalk: "unknown",
  greeting: "unknown",
  typo_oops: "unknown",
  repetition_complaint: "unknown",
  show_in_canvas: "unknown",
  ui_command: "unknown",
  presence_ping: "unknown",
  meta_feedback: "unknown",
  approval_help: "unknown",
  emotion_or_short_utterance: "unknown",
  section_overview: "unknown",
  unknown_domain_query: "unknown",
  conversational_misc: "unknown",
  operational_query: "epr",
  governance_query: "governance",
  architecture_query: "unknown",
  unsupported_domain: "unknown",
  staffing: "roster",
  locate: "unknown",
};

export function getAuthorityForTool(toolName: string): AuthorityDomain {
  const sortedRules = [...AUTHORITY_RULES].sort((a, b) => b.priority - a.priority);
  for (const rule of sortedRules) {
    if (rule.tools.includes(toolName)) {
      return rule.domain;
    }
  }
  return "unknown";
}

export function getPrimaryAuthorityForIntent(intent: string): AuthorityDomain {
  return INTENT_AUTHORITY_MAP[intent as TomIntent] ?? "unknown";
}
