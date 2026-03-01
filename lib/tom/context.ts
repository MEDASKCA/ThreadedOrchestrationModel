import { randomUUID } from "crypto";
import type { RichNextAction } from "@/lib/tom/rich-response";
import type { RiskLevel } from "@/lib/tom/governance/risk";

export type FilterContext = {
  specialty?: string;
  consultant?: string;
  site?: string;
  date_from?: string;
  date_to?: string;
};

export type TomContext = {
  sessionId: string;
  module?: string;
  filters?: FilterContext;
  recentIds: { pathways: string[]; threads: string[] };
  lastIntents: string[];
  lastSummary?: string;
  last_routing_path?: string;
  last_message_ignored?: boolean;
  last_topic?: {
    kind: "view" | "section" | "canvas" | "misc";
    id?: string;
    label?: string;
    updated_at: string;
  };
  last_snapshot?: {
    title: string;
    blocks: any[];
    trace_id: string;
    updated_at: string;
  };
  last_answer_context?: {
    trace_id: string;
    page_ids?: string[];
    finding_type?: string;
    finding_summary?: string;
    used_fact_ids?: string[];
    updated_at: string;
  };
  pendingActions: Array<RichNextAction & { action_id: string; requires_confirmation: boolean }>;
  pending_clarification?: {
    kind: "domain_priority" | "missing_required_tool";
    domains?: string[];
    tools?: string[];
    created_at: string;
    trace_id: string;
  };
  pending_approval?: {
    created_at: string;
    trace_id: string;
    action: { type: string; payload?: any };
    risk: RiskLevel;
    reason: string;
    user_summary: string;
    preview?: {
      target?: string;
      changes?: Array<{ field: string; from?: any; to?: any }>;
      reversible?: boolean;
    };
    dry_run?: boolean;
  };
  preferences?: {
    verbosity?: "short" | "normal" | "detailed";
    format?: "bullets" | "narrative";
    tone?: "neutral" | "friendly" | "formal";
  };
  page_context?: {
    section: string;
    view?: string;
    filters?: Record<string, any>;
    deeplink?: string;
    updated_at: string;
  };
  connectedSources: string[];
  missingSources: string[];
};

const contextStore = new Map<string, TomContext>();

export const getSessionId = (existing?: string) => {
  if (existing && existing.trim().length > 0) return existing;
  return randomUUID();
};

export const getContext = (sessionId: string): TomContext => {
  const existing = contextStore.get(sessionId);
  if (existing) return existing;
  const ctx: TomContext = {
    sessionId,
    recentIds: { pathways: [], threads: [] },
    lastIntents: [],
    pendingActions: [],
    pending_clarification: undefined,
    last_message_ignored: false,
    last_topic: undefined,
    last_snapshot: undefined,
    last_answer_context: undefined,
    preferences: {},
    page_context: undefined,
    connectedSources: [],
    missingSources: [],
  };
  contextStore.set(sessionId, ctx);
  return ctx;
};

export const updateContext = (sessionId: string, patch: Partial<TomContext>) => {
  const current = getContext(sessionId);
  const next: TomContext = {
    ...current,
    ...patch,
    recentIds: {
      pathways: patch.recentIds?.pathways ?? current.recentIds.pathways,
      threads: patch.recentIds?.threads ?? current.recentIds.threads,
    },
    lastIntents: patch.lastIntents ?? current.lastIntents,
    pendingActions: patch.pendingActions ?? current.pendingActions,
    pending_clarification: Object.prototype.hasOwnProperty.call(patch, "pending_clarification")
      ? patch.pending_clarification
      : current.pending_clarification,
    pending_approval: Object.prototype.hasOwnProperty.call(patch, "pending_approval")
      ? patch.pending_approval
      : current.pending_approval,
    last_message_ignored: Object.prototype.hasOwnProperty.call(patch, "last_message_ignored")
      ? patch.last_message_ignored
      : current.last_message_ignored,
    last_topic: Object.prototype.hasOwnProperty.call(patch, "last_topic")
      ? patch.last_topic
      : current.last_topic,
    last_snapshot: Object.prototype.hasOwnProperty.call(patch, "last_snapshot")
      ? patch.last_snapshot
      : current.last_snapshot,
    last_answer_context: Object.prototype.hasOwnProperty.call(patch, "last_answer_context")
      ? patch.last_answer_context
      : current.last_answer_context,
    preferences: {
      ...(current.preferences ?? {}),
      ...(patch.preferences ?? {}),
    },
    page_context: Object.prototype.hasOwnProperty.call(patch, "page_context")
      ? patch.page_context
      : current.page_context,
  };
  contextStore.set(sessionId, next);
  return next;
};
