import { describe, expect, it } from "vitest";
import { verifyResponse } from "../lib/tom/verifier";
import type { RichResponse } from "../lib/tom/rich-response";

describe("deep reasoning verify stage", () => {
  it("blocks unsupported numeric claims when no allowed facts", () => {
    const response: RichResponse = {
      title: "Result",
      summary: "There are 42 patients waiting.",
      sections: [],
      tables: [],
      next_actions: [],
      data_used: [],
      context_cards: [],
      confidence: { level: "low", rationale: "test" },
      signal_strength: { level: "low", score: 1, rationale: "test" },
    };
    const result = verifyResponse({
      response,
      evidence: [],
      allowedFactIds: [],
      toolsUsed: true,
      provenanceUsedFactIds: [],
    });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("no_allowed_facts_for_tool_response");
    expect(result.reasons).toContain("claims_without_evidence");
  });
});
