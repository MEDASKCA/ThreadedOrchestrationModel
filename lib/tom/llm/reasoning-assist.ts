import fs from "fs";
import path from "path";

export type ReasoningAssistRewriteInput = {
  message: string;
  intent: string;
  routing_path: string;
  page_context?: {
    section?: string;
    view?: string;
    view_label?: string;
    filters?: Record<string, unknown>;
  } | null;
  data_used?: Array<{ source: string; label?: string; value?: unknown }>;
  base: {
    title?: string;
    summary?: string;
    bullets?: string[];
    question?: string;
  };
};

export type ReasoningAssistRewriteOutput = {
  title?: string;
  summary?: string;
  voice_summary?: string;
  bullets?: string[];
  question?: string;
};

/**
 * Paths where we deliberately skip LLM polish — these are structural/mechanical
 * responses where deterministic text is more appropriate.
 */
export const REASONING_ASSIST_DENYLIST = new Set([
  "approval_gate",
  "action_confirmed",
  "typo_oops",
  "empty_prompt",
  "presence_ping",
]);

const getEnvLocalValue = (key: string): string | undefined => {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return undefined;
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    const found = lines.find((line) => line.startsWith(`${key}=`));
    if (!found) return undefined;
    const value = found.slice(key.length + 1).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
};

const getAssistEnabled = (): boolean => {
  // process.env takes priority (allows test overrides); fall back to reading .env.local
  const raw = process.env.TOM_REASONING_ASSIST ?? getEnvLocalValue("TOM_REASONING_ASSIST");
  return raw === "true";
};

const getAssistApiKey = (): string | undefined =>
  process.env.OPENAI_API_KEY ?? getEnvLocalValue("OPENAI_API_KEY");

const getAssistModel = (): string =>
  process.env.TOM_LLM_MODEL ?? getEnvLocalValue("TOM_LLM_MODEL") ?? "gpt-4o";

export function shouldUseReasoningAssist(params: {
  routingPath?: string;
}): boolean {
  if (!getAssistEnabled()) return false;
  if (!getAssistApiKey()) return false;
  if (!params.routingPath) return false;
  if (REASONING_ASSIST_DENYLIST.has(params.routingPath)) return false;
  return true;
}

export function getReasoningAssistSkipReason(params: {
  routingPath?: string;
}): string | null {
  if (!getAssistEnabled()) return "env_disabled";
  if (!getAssistApiKey()) return "missing_api_key";
  if (!params.routingPath) return "missing_routing_path";
  if (REASONING_ASSIST_DENYLIST.has(params.routingPath)) return "path_denylisted";
  return null;
}

const clean = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalize = (payload: any): ReasoningAssistRewriteOutput | null => {
  if (!payload || typeof payload !== "object") return null;
  return {
    title: clean(payload.title),
    summary: clean(payload.summary),
    voice_summary: clean(payload.voice_summary),
    bullets: Array.isArray(payload.bullets)
      ? payload.bullets.map((item: unknown) => clean(item)).filter(Boolean) as string[]
      : undefined,
    question: clean(payload.question),
  };
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

const parseAssistJson = (text: string): any | null => {
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

const TOM_SYSTEM_PROMPT = `You are TOM — an NHS healthcare operations intelligence system integrated with live clinical systems (EPR, Roster, Inventory, PAS).

Your job: take verified operational data and turn it into a clear, intelligent response that actually helps the person in front of you.

Tone: Think of a sharp, experienced NHS operational manager who has just checked the live system and is telling a colleague what they found. Direct. Warm. No jargon unless it's necessary. Never robotic. Never a list of facts read aloud.

Rules:
- Only use numbers and names from verified_data. Never invent clinical data.
- If data is sparse or missing, say so honestly and briefly.
- The summary should feel like a natural spoken update, not a formatted report.
- The title should describe the finding, not echo the user's question. (e.g. "3 patients breaching RTT" not "PTL Summary")
- Do not start your response with filler words like "Right", "Understood", "Got it", "Alright", "Sure", "Of course", or similar.
- Do not mention navigation menus, page lists, or system sections.

Return JSON with:
- "title": 3–8 words describing what was found
- "summary": 2–4 sentences. Natural, conversational, grounded in the actual numbers.
- "voice_summary": same meaning, shorter, optimised for text-to-speech
- "bullets": 2–4 key points only if the data genuinely has multiple distinct findings worth calling out
- "question": one follow-up question if it would genuinely help, otherwise omit`;


export async function reasoningAssistRewrite(
  input: ReasoningAssistRewriteInput,
): Promise<ReasoningAssistRewriteOutput | null> {
  if (!getAssistEnabled()) return null;
  const apiKey = getAssistApiKey();
  if (!apiKey) return null;

  const model = getAssistModel();
  // Enough room for a rich 3-4 sentence response + bullets + voice variant
  const maxOutputTokens = 700;

  // Build the verified data context — these are the facts TOM can reference
  const verifiedData = (input.data_used ?? [])
    .filter((d) => d.label && d.value !== undefined && d.value !== null)
    .map((d) => ({ label: d.label, value: d.value, source: d.source }));

  const hasVerifiedData = verifiedData.length > 0;

  const userPayload = {
    user_message: input.message,
    intent: input.intent,
    routing_path: input.routing_path,
    page_context: input.page_context ?? null,
    verified_data: hasVerifiedData ? verifiedData : null,
    deterministic_response: {
      title: input.base.title,
      summary: input.base.summary,
      bullets: input.base.bullets ?? [],
    },
    instruction: hasVerifiedData
      ? "You have verified data from NHS connectors. Synthesise it naturally into a conversational, intelligent response. Reference the actual numbers as a knowledgeable colleague would."
      : "No connector data is available for this query. Respond conversationally and helpfully based on what you know about the user's question and TOM's capabilities.",
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
        temperature: 0.4,
        max_tokens: maxOutputTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: TOM_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[tom.reasoning_assist] openai non-200", res.status, errorText.slice(0, 240));
      }
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? null;
    if (!text) return null;
    const parsedJson = parseAssistJson(text);
    if (!parsedJson) return null;
    const parsed = normalize(parsedJson);
    if (!parsed) return null;
    return parsed;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[tom.reasoning_assist] openai error", error);
    }
    return null;
  }
}
