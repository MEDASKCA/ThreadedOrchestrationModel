import { classifyIntent, type TomIntent } from "./intent";
import type { ToolContract } from "./tool-contracts";
import type { ViewSpec } from "../views/types";
import type { PlannerDecision } from "../llm/planner";

export type PlannerGateResult = {
  final_intent: TomIntent;
  final_routing_path:
    | "normal"
    | "approval_help"
    | "page_context"
    | "view_finder"
    | "section_overview"
    | "conversational_misc"
    | "metric_clarify";
  selectedTools: string[];
  selectedToolInputs?: Record<string, any>;
  clarify_question?: string;
  fallback_to_deterministic: boolean;
};

const VALID_INTENTS: TomIntent[] = [
  "smalltalk",
  "show_in_canvas",
  "greeting",
  "typo_oops",
  "repetition_complaint",
  "ui_command",
  "presence_ping",
  "meta_feedback",
  "approval_help",
  "emotion_or_short_utterance",
  "section_overview",
  "unknown_domain_query",
  "conversational_misc",
  "operational_query",
  "governance_query",
  "architecture_query",
  "unsupported_domain",
  "staffing",
  "locate",
];

// Intents where the deterministic classifier is highly specific and should never be overridden by the planner.
const DETERMINISTIC_ALWAYS_WIN: ReadonlySet<TomIntent> = new Set([
  "locate",        // requires both a lookup verb AND a proper-name pattern — very precise
  "ui_command",    // explicit navigation phrases
  "show_in_canvas",
  "greeting",
  "approval_help",
  "section_overview",
]);

// Intents that carry real data requests — if the planner routes these to "conversational", trust deterministic instead.
const DATA_INTENTS: ReadonlySet<TomIntent> = new Set([
  "operational_query",
  "governance_query",
  "staffing",
  "locate",
]);

const normalizeIntent = (intent: string, message: string): TomIntent => {
  const lowered = intent.trim().toLowerCase();
  const matched = VALID_INTENTS.find((candidate) => candidate === lowered);
  return matched ?? classifyIntent(message);
};

export function gatePlannerDecision(params: {
  decision: PlannerDecision | null;
  message: string;
  toolContracts: ToolContract[];
  viewRegistry: ViewSpec[];
  pending_approval?: any;
  pending_clarification?: any;
}): PlannerGateResult {
  const deterministicIntent = classifyIntent(params.message);
  const empty: PlannerGateResult = {
    final_intent: deterministicIntent,
    final_routing_path: "normal",
    selectedTools: [],
    selectedToolInputs: undefined,
    clarify_question: undefined,
    fallback_to_deterministic: true,
  };

  const decision = params.decision;
  if (!decision) return empty;

  // Guard 1 — deterministic always wins for high-precision intents.
  // These classifiers are more specific than the LLM planner; never let the planner override them.
  if (DETERMINISTIC_ALWAYS_WIN.has(deterministicIntent)) {
    return { ...empty, fallback_to_deterministic: true };
  }

  // Guard 2 — if the deterministic classifier sees a data/operational intent but the planner says
  // "conversational", the planner is wrong. Fall back to deterministic so the real data pipeline runs.
  if (DATA_INTENTS.has(deterministicIntent) && decision.routing_hint === "conversational") {
    return { ...empty, fallback_to_deterministic: true };
  }

  if (params.pending_approval) {
    return {
      ...empty,
      final_intent: "approval_help",
      final_routing_path: "approval_help",
      fallback_to_deterministic: false,
      clarify_question: decision.routing_hint === "approval_help" ? decision.clarify_question : undefined,
    };
  }

  if (params.pending_clarification) {
    return {
      ...empty,
      final_routing_path: "normal",
      fallback_to_deterministic: false,
      clarify_question: decision.routing_hint === "clarify" ? decision.clarify_question : undefined,
    };
  }

  if ((decision.confidence ?? 0) < 0.55) {
    return empty;
  }

  const final_intent = normalizeIntent(decision.intent, params.message);
  const contract = params.toolContracts.find((item) => item.intent === final_intent);
  const allowedTools = new Set(contract?.allowedTools ?? []);
  const suggestedTools = (decision.suggested_tools ?? []).filter((tool) => allowedTools.has(tool));

  const knownViews = new Set(params.viewRegistry.map((view) => view.id));
  const filteredViews = (decision.suggested_view_ids ?? []).filter((viewId) => knownViews.has(viewId));

  let final_routing_path: PlannerGateResult["final_routing_path"] = "normal";
  if (decision.routing_hint === "approval_help") {
    final_routing_path = "approval_help";
  } else if (decision.routing_hint === "section_overview") {
    final_routing_path = "section_overview";
  } else if (decision.routing_hint === "conversational") {
    final_routing_path = "conversational_misc";
  } else if (decision.routing_hint === "pages_first") {
    final_routing_path = filteredViews.length > 0 ? "view_finder" : "page_context";
  } else if (decision.routing_hint === "clarify") {
    final_routing_path = "metric_clarify";
  }

  if (filteredViews.length > 0) {
    return {
      final_intent,
      final_routing_path,
      selectedTools: ["view.read"],
      selectedToolInputs: {
        "view.read": filteredViews.length > 1
          ? { view_ids: filteredViews }
          : { view_id: filteredViews[0] },
      },
      clarify_question: decision.clarify_question,
      fallback_to_deterministic: false,
    };
  }

  return {
    final_intent,
    final_routing_path,
    selectedTools: suggestedTools,
    selectedToolInputs: undefined,
    clarify_question: decision.clarify_question,
    fallback_to_deterministic: false,
  };
}
