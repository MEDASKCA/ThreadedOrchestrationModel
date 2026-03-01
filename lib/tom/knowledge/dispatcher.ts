// lib/tom/knowledge/dispatcher.ts
// Main entry point for the TOM knowledge layer.
//
// Usage (in the chat route, after prompt extraction):
//
//   import { dispatchKnowledge } from "@/lib/tom/knowledge/dispatcher";
//   const knowledgeDispatch = dispatchKnowledge(prompt);
//
// The result tells you:
//   - matched: whether a known intent was recognised
//   - trigger_id: which rule fired (for audit)
//   - intent / domain: semantic classification
//   - confidence: 0.0–1.0
//   - signals: which words triggered the match
//   - response: the response template + processing states to use
//   - knowledge_pack_version: which config was active (for audit)

import { getAllTriggers, getResponse, getKnowledgePackVersion } from "./loader";
import { matchTriggers } from "./matcher";
import type { DispatchResult } from "./types";

const UNMATCHED: DispatchResult = {
  matched: false,
  trigger_id: null,
  response_key: null,
  intent: null,
  domain: null,
  confidence: 0,
  signals: [],
  response: null,
  knowledge_pack_version: "1.0.0",
};

/**
 * Classify a user prompt against the knowledge base.
 * Always returns a result — errors fall back to an unmatched result.
 * Never throws. Safe to call on every request.
 */
export function dispatchKnowledge(prompt: string): DispatchResult {
  try {
    const triggers = getAllTriggers();
    const match = matchTriggers(prompt, triggers);

    if (!match.matched || !match.trigger_id) {
      return { ...UNMATCHED, knowledge_pack_version: getKnowledgePackVersion() };
    }

    // Find the matched trigger to know which module owns the response file
    const trigger = triggers.find(t => t.id === match.trigger_id);
    if (!trigger) {
      return { ...UNMATCHED, knowledge_pack_version: getKnowledgePackVersion() };
    }

    const response = getResponse(trigger.module, match.response_key!);
    const version = getKnowledgePackVersion();

    return {
      matched: match.matched,
      trigger_id: match.trigger_id,
      response_key: match.response_key,
      intent: match.intent,
      domain: match.domain,
      confidence: match.confidence,
      signals: match.signals,
      response,
      knowledge_pack_version: version,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[knowledge.dispatch] error:", err);
    }
    return UNMATCHED;
  }
}
