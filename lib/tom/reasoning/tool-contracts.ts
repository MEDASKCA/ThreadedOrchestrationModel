import type { TomIntent } from "@/lib/tom/reasoning/intent";

export interface ToolContract {
  intent: TomIntent;
  allowedTools: string[];
  requiredTools?: string[];
  notes?: string;
}

export const TOOL_CONTRACTS: ToolContract[] = [
  { intent: "smalltalk", allowedTools: [], notes: "No tools in smalltalk." },
  { intent: "show_in_canvas", allowedTools: [], notes: "Canvas uses stored snapshots only." },
  { intent: "greeting", allowedTools: [], notes: "No tools in greeting." },
  { intent: "typo_oops", allowedTools: [], notes: "No tools in typo_oops." },
  { intent: "repetition_complaint", allowedTools: [], notes: "No tools in repetition complaints." },
  { intent: "ui_command", allowedTools: [], notes: "No tools in UI command routing." },
  { intent: "presence_ping", allowedTools: [], notes: "No tools in presence ping." },
  { intent: "meta_feedback", allowedTools: [], notes: "No tools in meta feedback." },
  { intent: "approval_help", allowedTools: [], notes: "No tools for approval help." },
  { intent: "emotion_or_short_utterance", allowedTools: [], notes: "No tools for short/emotional utterances." },
  { intent: "section_overview", allowedTools: [], notes: "No tools for section overview." },
  { intent: "unknown_domain_query", allowedTools: [], notes: "No tools for unknown domain prompts." },
  { intent: "conversational_misc", allowedTools: ["llm.general_answer"], notes: "General chat uses public LLM answer tool only." },
  { intent: "unsupported_domain", allowedTools: [], notes: "No tools." },
  {
    intent: "staffing",
    allowedTools: ["roster.staffing_summary"],
    requiredTools: ["roster.staffing_summary"],
  },
  {
    intent: "operational_query",
    allowedTools: [
      "epr.ptl_summary",
      "alerts.active",
      "anomalies.open",
      "pas.referrals_summary",
      "comms.summary",
      "roster.staffing_summary",
    ],
    notes: "Operational queries may call tools; actual selection depends on message.",
  },
  { intent: "governance_query", allowedTools: [], notes: "No tools yet." },
  { intent: "architecture_query", allowedTools: [], notes: "No tools." },
  {
    intent: "locate",
    allowedTools: ["workforce.person_lookup", "view.read"],
    requiredTools: ["workforce.person_lookup", "view.read"],
    notes: "Person/entity lookup — always runs person lookup and view search.",
  },
];

const EMPTY_CONTRACT: ToolContract = {
  intent: "unsupported_domain",
  allowedTools: [],
  notes: "Unknown intent fallback.",
};

export function getContract(intent: string): ToolContract {
  return TOOL_CONTRACTS.find((contract) => contract.intent === intent) ?? EMPTY_CONTRACT;
}

export function selectToolsForMessage(params: { intent: string; message: string }): string[] {
  const contract = getContract(params.intent);
  if (!contract.allowedTools.length) {
    return [];
  }

  // Required tools always run regardless of message content
  if (contract.requiredTools && contract.requiredTools.length > 0) {
    return [...contract.requiredTools];
  }

  const text = params.message.toLowerCase();
  const matches = new Set<string>();

  if (text.includes("ptl")) matches.add("epr.ptl_summary");
  if (text.includes("staff") || text.includes("staffing") || text.includes("rota")) matches.add("roster.staffing_summary");
  if (text.includes("alerts")) matches.add("alerts.active");
  if (text.includes("anomal")) matches.add("anomalies.open");
  if (text.includes("referral")) matches.add("pas.referrals_summary");
  if (text.includes("comms") || text.includes("communications")) matches.add("comms.summary");

  return contract.allowedTools.filter((tool) => matches.has(tool));
}
