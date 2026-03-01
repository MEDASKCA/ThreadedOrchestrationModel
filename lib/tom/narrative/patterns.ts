export interface PatternContext {
  intent: string;
  routing_path: string;
  tone: "neutral" | "friendly" | "formal";
  verbosity: "short" | "normal" | "detailed";
  trace_id: string;
}

const ACK_BY_PATH: Record<string, string[]> = {
  normal: ["Alright -", "Got it -", "No problem -", "Understood -"],
  pending_override: ["Got it -", "Alright -", "No problem -", "Understood -"],
  view_finder: ["Alright -", "Got it -", "Understood -", "No problem -"],
  page_context: ["Understood -", "Got it -", "Alright -", "No problem -"],
};

const pick = (trace_id: string, variants: string[]) => {
  if (!variants.length) return "";
  let hash = 0;
  for (let i = 0; i < trace_id.length; i += 1) {
    hash = ((hash * 33) + trace_id.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
};

const ensureSingleQuestion = (summary: string, question?: string) => {
  const cleanedSummary = summary.replace(/\?/g, ".");
  if (!question) return cleanedSummary.trim();
  const q = question.trim().replace(/[?!.]*$/, "");
  if (!q) return cleanedSummary.trim();
  return `${cleanedSummary.trim()} ${q}?`.trim();
};

export function applyConversationPattern(params: {
  ctx: PatternContext;
  title?: string;
  summary: string;
  bullets?: string[];
  question?: string;
  next_actions?: any[];
}): { title?: string; summary: string; bullets?: string[]; next_actions?: any[] } {
  const { ctx } = params;
  const acknowledgements = ACK_BY_PATH[ctx.routing_path] ?? [];
  const ack = acknowledgements.length > 0 ? pick(ctx.trace_id, acknowledgements) : "";

  let summary = params.summary.trim();
  const skipAck = summary.includes("Checked: Operations → Access & Pathways");
  if (!skipAck && ack && !summary.toLowerCase().startsWith(ack.toLowerCase())) {
    summary = `${ack} ${summary}`;
  }

  summary = ensureSingleQuestion(summary, params.question);

  let bullets = Array.isArray(params.bullets) ? [...params.bullets] : undefined;
  if (bullets) {
    if (ctx.verbosity === "short") {
      bullets = bullets.slice(0, 3);
    } else if (ctx.verbosity === "detailed") {
      bullets = bullets.slice(0, 7);
    }
  }

  const next_actions = Array.isArray(params.next_actions) ? params.next_actions : undefined;
  const shapedActions = params.question
    ? (next_actions && next_actions.length >= 2 ? next_actions : undefined)
    : next_actions;

  return {
    title: params.title,
    summary,
    bullets,
    next_actions: shapedActions,
  };
}
