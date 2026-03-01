export type PlannerRequest = {
  message: string;
  last_routing_path?: string;
  pending_clarification?: any;
  pending_approval?: any;
  page_context?: any;
  available_sections: string[];
  available_views?: Array<{ id: string; label: string; section: string; implemented?: boolean }>;
};

export type PlannerDecision = {
  intent: string;
  routing_hint: "pages_first" | "section_overview" | "conversational" | "approval_help" | "clarify";
  clarify_question?: string;
  suggested_section?: string;
  suggested_view_ids?: string[];
  suggested_tools?: string[];
  tone?: "neutral" | "friendly" | "formal";
  verbosity?: "short" | "normal" | "detailed";
  confidence: number;
  reasons: string[];
};

const parsePlannerJson = (text: string): any | null => {
  const trimmed = text.trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim(),
  ];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }
  return null;
};

const cleanText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const sanitizeClarifyQuestion = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const noDigits = value.replace(/\d+/g, "");
  const firstQuestion = noDigits.split("?")[0]?.trim();
  if (!firstQuestion) return undefined;
  return `${firstQuestion}?`;
};

const extractOutputText = (data: any): string | null => {
  const output = data?.output;
  if (Array.isArray(output)) {
    for (const block of output) {
      const content = block?.content;
      if (!Array.isArray(content)) continue;
      const text = content.find((item: any) => item?.type === "output_text")?.text;
      if (typeof text === "string") return text;
    }
  }
  return typeof data?.output_text === "string" ? data.output_text : null;
};

const normalizePlannerDecision = (payload: any): PlannerDecision | null => {
  if (!payload || typeof payload !== "object") return null;
  const intent = cleanText(payload.intent);
  const routingHint = cleanText(payload.routing_hint) as PlannerDecision["routing_hint"] | undefined;
  const confidenceRaw = typeof payload.confidence === "number" ? payload.confidence : Number(payload.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0;
  if (!intent || !routingHint) return null;
  if (!["pages_first", "section_overview", "conversational", "approval_help", "clarify"].includes(routingHint)) {
    return null;
  }
  const tone = cleanText(payload.tone) as PlannerDecision["tone"] | undefined;
  const verbosity = cleanText(payload.verbosity) as PlannerDecision["verbosity"] | undefined;
  const suggested_section = cleanText(payload.suggested_section)?.toLowerCase();
  const clarify_question = sanitizeClarifyQuestion(cleanText(payload.clarify_question));
  const suggested_view_ids = Array.isArray(payload.suggested_view_ids)
    ? payload.suggested_view_ids.map((item: unknown) => cleanText(item)).filter(Boolean) as string[]
    : undefined;
  const suggested_tools = Array.isArray(payload.suggested_tools)
    ? payload.suggested_tools.map((item: unknown) => cleanText(item)).filter(Boolean) as string[]
    : undefined;
  const reasons = Array.isArray(payload.reasons)
    ? payload.reasons.map((item: unknown) => cleanText(item)).filter(Boolean) as string[]
    : [];

  return {
    intent,
    routing_hint: routingHint,
    clarify_question,
    suggested_section,
    suggested_view_ids,
    suggested_tools,
    tone: tone && ["neutral", "friendly", "formal"].includes(tone) ? tone : undefined,
    verbosity: verbosity && ["short", "normal", "detailed"].includes(verbosity) ? verbosity : undefined,
    confidence,
    reasons,
  };
};

export async function planWithLLM(req: PlannerRequest): Promise<PlannerDecision | null> {
  if (process.env.TOM_LLM_PLANNER !== "true") return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.TOM_LLM_PLANNER_MODEL || process.env.TOM_LLM_MODEL || "gpt-4o-mini";
  const maxTokensRaw = Number(process.env.TOM_LLM_PLANNER_MAX_TOKENS || "300");
  const maxTokens = Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 ? maxTokensRaw : 300;

  const system = [
    "You are TOM's planner.",
    "You are advisory only and must not call tools.",
    "Do not invent facts, numbers, names, or dates.",
    "Return JSON only with fields: intent, routing_hint, clarify_question, suggested_section, suggested_view_ids, suggested_tools, tone, verbosity, confidence, reasons.",
    "clarify_question must contain at most one question.",
    "If uncertain, pick conversational with low confidence.",
  ].join("\n");

  const user = {
    message: req.message,
    last_routing_path: req.last_routing_path || null,
    pending_clarification: req.pending_clarification || null,
    pending_approval: req.pending_approval || null,
    page_context: req.page_context || null,
    available_sections: req.available_sections,
    available_views: req.available_views ?? [],
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? null;
    if (!text) return null;
    const parsed = parsePlannerJson(text);
    if (!parsed) return null;
    return normalizePlannerDecision(parsed);
  } catch {
    return null;
  }
}

