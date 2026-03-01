export type ReasoningStage = "think" | "read" | "verify" | "respond";

export type PlanStep =
  | { kind: "clarify"; question: string; options?: string[] }
  | { kind: "read_views"; view_ids: string[]; rationale: string }
  | { kind: "respond"; rationale: string };

export type ThinkPlan = {
  stage: "think";
  intent: string;
  confidence: number;
  chosen_section?: string;
  view_candidates: Array<{ id: string; label: string; score: number; implemented: boolean }>;
  steps: PlanStep[];
  notes?: string[];
};

const UNKNOWN_DOMAIN_WORDS = [
  "forums",
  "social",
  "complaints",
  "media",
  "research",
  "finance",
  "hr",
  "payroll",
  "marketing",
  "legal",
] as const;

const hasUnknownDomainWord = (message: string) => {
  const text = String(message || "").toLowerCase();
  return UNKNOWN_DOMAIN_WORDS.find((word) => text.includes(word)) ?? null;
};

export async function buildThinkPlan(params: {
  message: string;
  page_context?: any;
  viewRegistry: any;
  findRelevantViews: (args: {
    message: string;
    registry: Array<{ id: string; label: string; section: string; implemented: boolean; notes?: string }>;
  }) => Array<{ id: string; score: number; reasons: string[] }>;
  classifyIntent: (msg: string) => string;
}): Promise<ThinkPlan> {
  const intent = params.classifyIntent(params.message);
  const registry = (params.viewRegistry as Array<any>).map((view) => ({
    id: String(view.id),
    label: String(view.label),
    section: String(view.section),
    implemented: Boolean(view.implemented),
    notes: typeof view.notes === "string" ? view.notes : undefined,
  }));
  const candidatesRaw = params.findRelevantViews({ message: params.message, registry });
  const candidates = candidatesRaw.map((candidate) => {
    const view = registry.find((item) => item.id === candidate.id);
    return {
      id: candidate.id,
      label: view?.label ?? candidate.id,
      score: candidate.score,
      implemented: Boolean(view?.implemented),
    };
  });
  const notes: string[] = [];
  const steps: PlanStep[] = [];
  const chosenSection = typeof params.page_context?.section === "string"
    ? params.page_context.section
    : candidates[0]?.id.split(".")[0];

  const topImplemented = candidates.filter((item) => item.implemented);
  const first = topImplemented[0];
  const second = topImplemented[1];
  const unknownDomainWord = hasUnknownDomainWord(params.message);
  const threshold = 2;

  if (unknownDomainWord && (!first || first.score < threshold)) {
    notes.push("unknown_domain_no_viable_view");
    steps.push({
      kind: "clarify",
      question: `I do not have a direct ${unknownDomainWord} view yet. Do you mean an internal system, patient feedback, or an external source?`,
      options: ["internal system", "patient feedback", "external source"],
    });
    steps.push({ kind: "respond", rationale: "Ask one targeted clarification before reading." });
  } else if (first) {
    const viewIds = [first.id];
    if (second && Math.abs(first.score - second.score) <= 1 && second.implemented) {
      viewIds.push(second.id);
      notes.push("dual_view_budget");
    }
    steps.push({
      kind: "read_views",
      view_ids: viewIds,
      rationale: "Pages-first read based on view finder scores.",
    });
    steps.push({ kind: "respond", rationale: "Answer only from verified evidence." });
  } else {
    notes.push("no_viable_view_candidates");
    steps.push({
      kind: "clarify",
      question: "Which area should I check first?",
      options: ["operations", "logistics", "planning", "collaboration", "intelligence"],
    });
    steps.push({ kind: "respond", rationale: "Clarify scope before reading pages." });
  }

  return {
    stage: "think",
    intent,
    confidence: first ? 0.78 : 0.52,
    chosen_section: chosenSection,
    view_candidates: candidates,
    steps,
    notes,
  };
}
