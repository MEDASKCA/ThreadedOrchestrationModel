import { dedupeLines } from "./dedupe";

const collapseLeadingRepeat = (value: string) => value.replace(/^(\w+)([,\s]+)\1\b/i, "$1");
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

const dedupeSentences = (value: string) => {
  const parts = value
    .split(SENTENCE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return value.trim();

  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out.join(" ").trim();
};

export function sanitizeTextBlock(s?: string): string {
  const lines = collapseLeadingRepeat(dedupeLines(String(s || ""))).trim();
  return dedupeSentences(lines);
}

export function sanitizeRichResponse(rich: { title?: string; summary?: string; bullets?: string[] }) {
  const title = sanitizeTextBlock(rich.title);
  const summary = sanitizeTextBlock(rich.summary);
  const bullets = Array.isArray(rich.bullets)
    ? rich.bullets
      .map((bullet) => sanitizeTextBlock(bullet))
      .filter(Boolean)
    : [];

  const combined = [title, summary, ...bullets];
  const allQuestionIndexes: Array<{ idx: number; pos: number }> = [];
  combined.forEach((line, idx) => {
    const last = line.lastIndexOf("?");
    if (last >= 0) allQuestionIndexes.push({ idx, pos: last });
  });
  const keep = allQuestionIndexes.length > 0 ? allQuestionIndexes[allQuestionIndexes.length - 1] : null;
  const normalized = combined.map((line, idx) => {
    if (!line.includes("?")) return line;
    if (keep && keep.idx === idx) {
      const cleaned = line.replace(/\?/g, "");
      return `${cleaned}?`.replace(/\s+/g, " ").trim();
    }
    return line.replace(/\?/g, ".").replace(/\s+/g, " ").trim();
  });

  return {
    title: normalized[0] || "",
    summary: normalized[1] || "",
    bullets: normalized.slice(2),
  };
}

export const sanitizeRichText = sanitizeRichResponse;
