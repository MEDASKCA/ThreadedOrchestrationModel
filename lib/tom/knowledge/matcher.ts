// lib/tom/knowledge/matcher.ts
// Deterministic phrase-matching engine.
// Scores each trigger against the user prompt and returns the best match.
//
// Scoring rules:
//   must_not match  → score = 0 (disqualified)
//   must_any match  → base score 0.5–0.7 (required)
//   should_any hits → up to +0.3 additional confidence
//   priority        → used as tiebreaker (not in score, just sort order)

import type { KnowledgeTrigger, DispatchResult } from "./types";

const CONFIDENCE_THRESHOLD = 0.45;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const norm = normalize(phrase);
  if (norm.includes(" ")) return haystack.includes(norm);
  return new RegExp(`\\b${norm}\\b`).test(haystack);
}

function scoreTrigger(
  prompt: string,
  trigger: KnowledgeTrigger,
): { score: number; signals: string[] } {
  const p = normalize(prompt);

  // must_not: any match disqualifies
  if (trigger.match.must_not) {
    for (const term of trigger.match.must_not) {
      if (containsPhrase(p, term)) return { score: 0, signals: [] };
    }
  }

  // must_any: at least one required
  const mustHits = trigger.match.must_any.filter(t => containsPhrase(p, t));
  if (mustHits.length === 0) return { score: 0, signals: [] };

  const signals: string[] = [...mustHits];
  let score = 0.5 + (mustHits.length / trigger.match.must_any.length) * 0.2;

  // should_any: each hit adds confidence
  if (trigger.match.should_any?.length) {
    const shouldHits = trigger.match.should_any.filter(t => containsPhrase(p, t));
    signals.push(...shouldHits);
    score += (shouldHits.length / trigger.match.should_any.length) * 0.3;
  }

  return { score: Math.min(score, 1.0), signals };
}

type MatchResult = Omit<DispatchResult, "response" | "knowledge_pack_version">;

export function matchTriggers(prompt: string, triggers: KnowledgeTrigger[]): MatchResult {
  const empty: MatchResult = {
    matched: false,
    trigger_id: null,
    response_key: null,
    intent: null,
    domain: null,
    confidence: 0,
    signals: [],
  };

  if (!prompt || triggers.length === 0) return { ...empty };

  // Sort by priority descending so higher-priority triggers win ties
  const sorted = [...triggers].sort((a, b) => b.priority - a.priority);

  let best: { trigger: KnowledgeTrigger; score: number; signals: string[] } | null = null;

  for (const trigger of sorted) {
    const { score, signals } = scoreTrigger(prompt, trigger);
    if (score >= CONFIDENCE_THRESHOLD && (!best || score > best.score)) {
      best = { trigger, score, signals };
    }
  }

  if (!best) return { ...empty };

  return {
    matched: true,
    trigger_id: best.trigger.id,
    response_key: best.trigger.response_key,
    intent: best.trigger.intent,
    domain: best.trigger.domain,
    confidence: Math.round(best.score * 100) / 100,
    signals: best.signals,
  };
}
