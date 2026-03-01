import { describe, expect, it } from "vitest";
import { verifyResponse } from "../lib/tom/verifier";
import type { RichResponse } from "../lib/tom/rich-response";

describe("TOM verifier", () => {
  it("rejects unknown numbers", () => {
    const rich: RichResponse = {
      title: "Test",
      summary: "Count is 7.",
      voice_summary: "Count is 7.",
      sections: [],
      tables: [],
      next_actions: [],
      context_cards: [],
      data_used: [{ source: "EPR", label: "Count", value: 5 }],
      confidence: { level: "low", rationale: "test" },
      signal_strength: { level: "low", score: 10, rationale: "test" },
    };
    const res = verifyResponse(rich, rich.data_used);
    expect(res.ok).toBe(false);
  });

  it("rejects unknown patient names", () => {
    const rich: RichResponse = {
      title: "Test",
      summary: "Marcus Osei is waiting.",
      voice_summary: "Marcus Osei is waiting.",
      sections: [],
      tables: [],
      next_actions: [],
      context_cards: [],
      data_used: [{ source: "EPR", label: "Patient", value: "Sandra Livingstone" }],
      confidence: { level: "low", rationale: "test" },
      signal_strength: { level: "low", score: 10, rationale: "test" },
    };
    const res = verifyResponse(rich, rich.data_used);
    expect(res.ok).toBe(false);
  });
});
