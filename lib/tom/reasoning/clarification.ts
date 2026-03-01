import { getAuthorityForTool } from "@/lib/tom/reasoning/authority";

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  epr: ["epr", "ptl", "waiting", "rtt", "patient"],
  roster: ["roster", "staff", "staffing", "rota", "shift"],
  planning: ["planning", "session", "sessions"],
  collaboration: ["collaboration", "deliverable", "deliverables", "forum", "thread", "threads"],
  inventory: ["inventory", "stock", "supplies"],
  access_pathways: ["pathway", "pathways", "referral", "referrals", "pas"],
  comms: ["comms", "communication", "communications", "message", "messages"],
  governance: ["governance", "alert", "alerts", "anomaly", "anomalies", "risk"],
  opcs: ["opcs"],
};

export const resolveClarificationDomainChoice = (params: {
  message: string;
  domains?: string[];
}): string | null => {
  const text = params.message.toLowerCase();

  const explicitMatch = (params.domains ?? []).find((domain) => text.includes(domain.toLowerCase()));
  if (explicitMatch) return explicitMatch;

  const matches = Object.entries(DOMAIN_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => text.includes(kw)))
    .map(([domain]) => domain);

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
};

export const filterToolsByDomain = (tools: string[], domain: string) => {
  return tools.filter((tool) => getAuthorityForTool(tool) === domain);
};
