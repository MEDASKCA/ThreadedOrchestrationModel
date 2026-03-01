import { classifyIntent } from "@/lib/tom/reasoning/intent";
import { computeConfidence, type DataUsed } from "@/lib/tom/reasoning/engine";
import { getToolByName } from "@/lib/tom/tools/registry";
import type { RichNextAction, RichDataUsed } from "@/lib/tom/rich-response";
import type { TomIntent } from "@/lib/tom/reasoning/intent";

export type TruthFirewallInput = {
  prompt: string;
  intent?: TomIntent;
  selectedTools?: string[];
  selectedToolInputs?: Record<string, any>;
  context: {
    connectedSources: string[];
    missingSources: string[];
    module?: string;
    filters?: Record<string, string>;
  };
};

export type TruthFirewallOutput = {
  intent: TomIntent;
  facts: Record<string, unknown>;
  derived_metrics: Record<string, unknown>;
  evidence: RichDataUsed[];
  executed_tools: string[];
  permitted_actions: Array<RichNextAction & { action_id: string; requires_confirmation: boolean }>;
  missing_sources: string[];
  confidence: { level: "low" | "medium" | "high"; rationale: string };
  signal_strength: { level: "low" | "medium" | "high"; score: number; rationale: string };
};

const generateActionId = () => `act_${Math.random().toString(36).slice(2, 10)}`;

const buildSignalStrength = (evidence: RichDataUsed[], confidence: { level: "low" | "medium" | "high" }) => {
  const sources = new Set(evidence.map((e) => e.source));
  const numeric = evidence.filter((e) => typeof e.value === "number" || typeof e.record_counts === "number").length;
  let score = Math.min(100, sources.size * 25 + numeric * 10);
  if (confidence.level === "low") score = Math.min(score, 40);
  if (confidence.level === "high") score = Math.max(score, 70);
  const level: "low" | "medium" | "high" = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  const srcLabel = sources.size === 1 ? "1 live source" : `${sources.size} live sources`;
  const metricLabel = numeric === 0 ? "" : numeric === 1 ? " with 1 key metric" : ` with ${numeric} key metrics`;
  return { level, score, rationale: `Based on ${srcLabel}${metricLabel}.` };
};

const buildActions = (intent: string): Array<RichNextAction & { action_id: string; requires_confirmation: boolean }> => {
  const actions: RichNextAction[] = [];
  if (intent === "operational_query") {
    actions.push(
      { label: "Open PTL", rationale: "Review the full list.", action_type: "open", payload: { view: "ptl" } },
      { label: "Show breaching", rationale: "Focus on high risk.", action_type: "filter", payload: { rtt_status: "breaching" } },
      { label: "Review scheduling blockers", rationale: "Reduce delays.", action_type: "filter", payload: { metric: "awaiting_scheduling" } },
    );
  }
  if (intent === "governance_query") {
    actions.push(
      { label: "List anomalies", rationale: "Inspect trend shifts.", action_type: "open", payload: { view: "anomalies" } },
      { label: "Open breach tracking", rationale: "See root causes.", action_type: "open", payload: { view: "breach" } },
    );
  }
  if (intent === "staffing") {
    actions.push(
      { label: "Connect roster", rationale: "Enable staffing coverage.", action_type: "connect", payload: { source: "roster" } },
    );
  }
  return actions.map((action) => ({ ...action, action_id: generateActionId(), requires_confirmation: action.action_type !== "open" }));
};

export const runTruthFirewall = async (input: TruthFirewallInput): Promise<TruthFirewallOutput> => {
  const intent = input.intent ?? classifyIntent(input.prompt);
  const evidence: RichDataUsed[] = [];
  const facts: Record<string, unknown> = {};
  const derived_metrics: Record<string, unknown> = {};
  const missing_sources = [...input.context.missingSources];
  const executed_tools: string[] = [];

  const defaultToolsByIntent: Record<TomIntent, string[]> = {
    smalltalk: [],
    greeting: [],
    typo_oops: [],
    repetition_complaint: [],
    show_in_canvas: [],
    ui_command: [],
    presence_ping: [],
    meta_feedback: [],
    approval_help: [],
    emotion_or_short_utterance: [],
    section_overview: [],
    unknown_domain_query: [],
    conversational_misc: [],
    unsupported_domain: [],
    architecture_query: [],
    governance_query: ["epr.ptl_summary", "alerts.active", "anomalies.open"],
    operational_query: ["epr.ptl_summary", "alerts.active", "anomalies.open"],
    staffing: ["roster.staffing_summary"],
    locate: ["workforce.person_lookup", "view.read"],
  };
  const toolsToRun = (input.selectedTools && input.selectedTools.length > 0)
    ? input.selectedTools
    : defaultToolsByIntent[intent] ?? [];

  for (const toolName of toolsToRun) {
    const tool = getToolByName(toolName);
    if (!tool) continue;
    executed_tools.push(toolName);
    const toolInput = input.selectedToolInputs?.[toolName] ?? {};
    const result: any = await tool.run(toolInput);

    if (toolName === "epr.ptl_summary") {
      if (result?.ok && result.data) {
        facts.ptl_summary = result.data;
        const counts = (result.data as any).counts || {};
        Object.entries(counts).forEach(([key, value]) => {
          evidence.push({ source: "EPR/PTL", label: key.replace(/_/g, " "), value: value as number });
        });
        if (Object.keys(counts).length === 0) {
          evidence.push({ source: "EPR/PTL", label: "PTL records", value: 0 });
        }
      } else if (result?.error) {
        if (!missing_sources.includes("EPR")) missing_sources.push("EPR");
        evidence.push({ source: "EPR/PTL", label: "PTL status", value: "Not connected" });
      }
      continue;
    }

    if (toolName === "alerts.active") {
      if (result?.ok && result.data) {
        facts.alerts = result.data;
        derived_metrics.alerts_count = (result.data as any[]).length;
        evidence.push({ source: "TOM Alerts", label: "Active alerts", value: (result.data as any[]).length });
      }
      continue;
    }

    if (toolName === "anomalies.open") {
      if (result?.ok && result.data) {
        facts.anomalies = result.data;
        derived_metrics.anomalies_count = (result.data as any[]).length;
        evidence.push({ source: "TOM Anomaly Engine", label: "Open anomalies", value: (result.data as any[]).length });
      }
      continue;
    }

    if (toolName === "pas.referrals_summary") {
      if (result?.ok && result.data) {
        facts.referrals = result.data;
        evidence.push({ source: "PAS", label: "Referrals summary", value: "Loaded" });
      }
      continue;
    }

    if (toolName === "comms.summary") {
      if (result?.ok && result.data) {
        facts.comms = result.data;
        evidence.push({ source: "Comms", label: "Comms summary", value: "Loaded" });
      }
      continue;
    }

    if (toolName === "roster.staffing_summary") {
      if (result?.ok && result.data) {
        facts.staffing = result.data;
        evidence.push({ source: "Roster", label: "Roster status", value: "Connected" });
      } else {
        if (!missing_sources.includes("ROSTER")) missing_sources.push("ROSTER");
        evidence.push({ source: "Roster", label: "Roster status", value: "Not connected" });
      }
    }

    if (toolName === "workforce.person_lookup") {
      if (result?.ok && result.data) {
        facts.person_lookup = result.data;
        const lookup = result.data as any;
        const sources = (lookup.sources_checked as string[]) ?? [];
        evidence.push({
          source: "Staff Finder",
          label: "Person lookup",
          value: lookup.match_type === "single"
            ? "1 match"
            : lookup.match_type === "multiple"
            ? `${lookup.matches?.length ?? 0} matches`
            : "No match found",
        });
        for (const src of sources.slice(1)) {
          evidence.push({ source: src, label: `Search: ${lookup.query_name}`, value: "Checked" });
        }
      } else if (result?.error) {
        evidence.push({ source: "Staff Finder", label: "Person lookup", value: "Not connected" });
      }
      continue;
    }

    if (toolName === "view.read") {
      if (result?.ok && result.data) {
        if (Array.isArray(result.data.views)) {
          facts.views = result.data.views;
          facts.view = result.data.views[0]?.data;
        } else {
          facts.view = result.data.data;
        }
        const toolEvidence = Array.isArray(result.data.evidence) ? result.data.evidence : [];
        if (toolEvidence.length > 0) {
          for (const item of toolEvidence) {
            evidence.push({
              source: String(item?.source || "view.read"),
              kind: item?.kind ? String(item.kind) : undefined,
              fetched_at: item?.fetched_at ? String(item.fetched_at) : undefined,
              inputs: item?.inputs && typeof item.inputs === "object" ? item.inputs : undefined,
              records: Array.isArray(item?.records) ? item.records : undefined,
              label: item?.label ? String(item.label) : "View data",
              value: typeof item?.value === "number" || typeof item?.value === "string" ? item.value : "Loaded",
            });
          }
        } else {
          evidence.push({ source: "view.read", label: "View data", value: "Loaded" });
        }
      } else if (result?.error) {
        evidence.push({ source: "view.read", label: "View read status", value: result.error });
      }
    }
  }

  if (evidence.length === 0 && input.context.connectedSources.length > 0) {
    evidence.push({ source: "TOM", label: "Connected sources", value: input.context.connectedSources.join(", ") });
  }

  const dataUsedForConfidence = evidence.map((item) => ({
    label: item.label ?? item.source,
    value: item.value ?? "",
    source: item.source,
  })) as DataUsed[];
  const confidence = computeConfidence(dataUsedForConfidence, intent);
  const signal_strength = buildSignalStrength(evidence, confidence);
  const permitted_actions = buildActions(intent);

  return {
    intent,
    facts,
    derived_metrics,
    evidence,
    executed_tools,
    permitted_actions,
    missing_sources,
    confidence,
    signal_strength,
  };
};
