import { RICH_VARIANTS } from "./variants";

export type VoiceTone = "neutral" | "friendly" | "formal";
export type VoiceVerbosity = "short" | "normal" | "detailed";

export interface VoiceContext {
  tone: VoiceTone;
  verbosity: VoiceVerbosity;
  routing_path: string;
  intent: string;
  trace_id: string;
  page_label?: string;
}

export const VOICE_VARIANTS: {
  normal_operational: string[];
  pending_work: string[];
  view_summary: string[];
  clarify: string[];
  fallback: string[];
} = {
  normal_operational: RICH_VARIANTS.section_overview_intro.map((line) =>
    line.replaceAll("{{section}}", "this section"),
  ),
  pending_work: [...RICH_VARIANTS.explore_intro],
  view_summary: RICH_VARIANTS.view_summary_intro.map((line) =>
    line.replaceAll("{{view}}", "the selected view"),
  ),
  clarify: RICH_VARIANTS.clarify_wrappers.map((line) =>
    line.replaceAll("{{question}}", "what should I prioritise first?"),
  ),
  fallback: [
    "I can still help from what is available.",
    "I can continue with the data currently connected.",
    "I can move forward with the current coverage.",
    "I can still provide a safe next step.",
    "I can continue with what I can verify.",
    "I can still give a grounded response.",
    "I can proceed with current visibility.",
    "I can continue within connected scope.",
    "I can still guide the next action.",
    "I can proceed without making assumptions.",
    "I can still help from available evidence.",
    "I can continue with current sources only.",
  ],
};

const capitalise = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const fill = (template: string, vars: Record<string, string>) => {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
};

const tonePrefix = (tone: VoiceTone) => {
  if (tone === "formal") return "Please note: ";
  if (tone === "neutral") return "";
  return "";
};

const normalizeIntro = (value: string) => {
  if (!value) return value;
  return value.replace(/^Okay\b[\s,-]*/i, "Understood - ");
};

const sentencePrefix = (tone: VoiceTone, verbosity: VoiceVerbosity, trace_id: string) => {
  const friendly = ["Alright,", "Got it,", "Understood,", "Right,"];
  const neutral = ["", "", "In brief,", "At a glance,", "Currently,"];
  const formal = ["Understood.", "Noted.", "Certainly.", "As requested.", "For clarity,"];
  if (verbosity === "short") return "";
  const list = tone === "formal" ? formal : tone === "neutral" ? neutral : friendly;
  const picked = pickVariant(`${trace_id}:prefix`, list);
  return picked ? `${picked} ` : "";
};

export function pickVariant(trace_id: string, variants: readonly string[]): string {
  if (!Array.isArray(variants) || variants.length === 0) return "";
  let hash = 0;
  for (let i = 0; i < trace_id.length; i += 1) {
    hash = ((hash * 31) + trace_id.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
}

export function voiceIntro(ctx: VoiceContext): string {
  const path = ctx.routing_path;
  if (path === "section_overview") {
    const section = capitalise((ctx.page_label || "section").replaceAll("-", " "));
    return normalizeIntro(fill(
      pickVariant(`${ctx.trace_id}:${path}:${ctx.intent}`, RICH_VARIANTS.section_overview_intro),
      { section },
    ));
  }
  if (path === "explore_mode") {
    return normalizeIntro(pickVariant(`${ctx.trace_id}:${path}:${ctx.intent}`, RICH_VARIANTS.explore_intro));
  }
  if (path === "conversational_misc") {
    return normalizeIntro(pickVariant(`${ctx.trace_id}:${path}:${ctx.intent}`, [
      "Understood.",
      "Sure.",
      "Got it.",
      "Absolutely.",
      "No problem.",
      "I can help with that.",
    ]));
  }
  if (path === "page_context" || path === "view_finder") {
    const view = ctx.page_label ? ctx.page_label.replaceAll("-", " ") : "the selected view";
    return normalizeIntro(fill(
      pickVariant(`${ctx.trace_id}:${path}:${ctx.intent}`, RICH_VARIANTS.view_summary_intro),
      { view },
    ));
  }

  let variants = VOICE_VARIANTS.normal_operational;
  if (path === "pending_override") {
    variants = VOICE_VARIANTS.pending_work;
  } else if (path === "metric_clarify") {
    variants = VOICE_VARIANTS.clarify;
  } else if (path === "connector_fallback") {
    variants = VOICE_VARIANTS.fallback;
  }
  const intro = normalizeIntro(pickVariant(`${ctx.trace_id}:${path}:${ctx.intent}`, variants));
  return `${tonePrefix(ctx.tone)}${intro}`.trim();
}

export function voiceClarifyQuestion(ctx: VoiceContext, baseQuestion: string): string {
  const base = baseQuestion.trim();
  if (!base) return base;
  const opener = fill(
    pickVariant(`${ctx.trace_id}:clarify`, RICH_VARIANTS.clarify_wrappers),
    { question: base.replace(/[?]+$/, "") },
  );
  const toneLead = ctx.tone === "formal" ? "Please confirm this point." : "";
  return [toneLead, opener].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function voiceSummary(ctx: VoiceContext, baseSummary: string): string {
  const base = baseSummary.trim();
  if (!base) return base;
  if (base.includes("Checked: Operations → Access & Pathways")) {
    return base;
  }
  const intro = voiceIntro(ctx);
  const prefix = sentencePrefix(ctx.tone, ctx.verbosity, ctx.trace_id);
  if (ctx.verbosity === "short") {
    return `${intro} ${base}`.replace(/\s+/g, " ").trim();
  }
  return `${prefix}${intro} ${base}`.replace(/\s+/g, " ").trim();
}
