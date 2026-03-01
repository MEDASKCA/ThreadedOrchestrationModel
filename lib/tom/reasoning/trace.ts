import { randomUUID } from "crypto";
import type { TomIntent } from "@/lib/tom/reasoning/intent";

export type ReasoningIntent = TomIntent;

export type RiskLevel = "low" | "medium" | "high";

export interface ReasoningTrace {
  trace_id: string;
  created_at: string;
  user_message: string;
  intent: ReasoningIntent;
  intent_confidence: number;
  goal?: string;
  constraints: string[];
  ambiguity: { score: number; reasons: string[] };
  plan: { steps: Array<{ id: string; kind: "tool" | "compute" | "clarify" | "respond"; name: string; input?: any }> };
  route: { mode: "deterministic" | "llm_structured" | "llm_phrase"; reason: string; routing_path?: string };
  verification: { required: boolean; rules: string[] };
  allowed_facts: { ids: string[] };
  conflicts?: Array<{
    kind: "multi_domain" | "tool_not_allowed" | "missing_required" | "unknown_tool";
    severity: "low" | "medium" | "high";
    details: string;
    tools?: string[];
    domains?: string[];
  }>;
  teaching?: {
    clarification?: {
      requested?: boolean;
      kind?: string;
      options?: string[];
      resolved?: boolean;
      choice?: string;
      prior_trace_id?: string;
    };
    preferences?: {
      extracted?: {
        verbosity?: "short" | "normal" | "detailed";
        format?: "bullets" | "narrative";
        tone?: "neutral" | "friendly" | "formal";
      };
      applied?: {
        verbosity?: "short" | "normal" | "detailed";
        format?: "bullets" | "narrative";
        tone?: "neutral" | "friendly" | "formal";
      };
    };
  };
  governance?: {
    approval?: {
      requested?: boolean;
      risk?: RiskLevel;
      reason?: string;
      action_type?: string;
      approved?: boolean;
      executed?: boolean;
      outcome?: string;
    };
  };
  outcome?: { status: "ok" | "fallback" | "blocked"; notes?: string };
}

const fallbackTraceId = () => `trace_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

const generateTraceId = () => {
  const globalCrypto = (typeof globalThis !== "undefined" ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto : undefined);
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  try {
    return randomUUID();
  } catch {
    return fallbackTraceId();
  }
};

export const createTraceBase = (input: { user_message: string; intent: ReasoningIntent; intent_confidence: number }): ReasoningTrace => {
  return {
    trace_id: generateTraceId(),
    created_at: new Date().toISOString(),
    user_message: input.user_message,
    intent: input.intent,
    intent_confidence: input.intent_confidence,
    constraints: [],
    ambiguity: { score: 0, reasons: [] },
    plan: { steps: [] },
    route: { mode: "deterministic", reason: "default", routing_path: "normal" },
    verification: { required: false, rules: [] },
    allowed_facts: { ids: [] },
    conflicts: [],
    teaching: {},
    governance: {},
  };
};
