import { describe, expect, it } from "vitest";
import { verifyResponse } from "../lib/tom/verifier";
import type { RichResponse } from "../lib/tom/rich-response";

describe("verifier allowed facts", () => {
  it("blocks when tools are used but no allowed facts are present", () => {
    const rich: RichResponse = {
      title: "PTL summary",
      summary: "PTL overview available.",
      voice_summary: "PTL overview available.",
      sections: [],
      tables: [],
      next_actions: [],
      context_cards: [],
      data_used: [{ source: "EPR", label: "PTL records", value: 0 }],
      confidence: { level: "low", rationale: "test" },
      signal_strength: { level: "low", score: 0, rationale: "test" },
    };

    const result = verifyResponse({
      response: rich,
      evidence: rich.data_used,
      allowedFactIds: [],
      toolsUsed: true,
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("no_allowed_facts_for_tool_response");
  });
});
