import { describe, expect, it } from "vitest";
import { verifyResponse } from "../lib/tom/verifier";
import type { RichResponse } from "../lib/tom/rich-response";

const baseResponse = (): RichResponse => ({
  title: "Test",
  summary: "PTL summary available",
  voice_summary: "PTL summary available",
  sections: [],
  tables: [],
  next_actions: [],
  context_cards: [],
  data_used: [{ source: "EPR/PTL", label: "PTL records", value: 0 }],
  confidence: { level: "low", rationale: "test" },
  signal_strength: { level: "low", score: 0, rationale: "test" },
});

describe("used facts subset verification", () => {
  it("blocks when provenance contains ids outside allowed facts", () => {
    const response: RichResponse = {
      ...baseResponse(),
      provenance: { used_fact_ids: ["tool:epr.ptl_summary", "evidence:unknown:0"] },
    };

    const result = verifyResponse({
      response,
      evidence: response.data_used,
      allowedFactIds: ["tool:epr.ptl_summary", "evidence:EPR/PTL:0"],
      provenanceUsedFactIds: response.provenance?.used_fact_ids,
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("used_facts_not_subset_of_allowed");
  });

  it("passes when provenance used facts are a subset of allowed facts", () => {
    const response: RichResponse = {
      ...baseResponse(),
      provenance: { used_fact_ids: ["tool:epr.ptl_summary"] },
    };

    const result = verifyResponse({
      response,
      evidence: response.data_used,
      allowedFactIds: ["tool:epr.ptl_summary", "evidence:EPR/PTL:0"],
      provenanceUsedFactIds: response.provenance?.used_fact_ids,
    });

    expect(result.ok).toBe(true);
  });
});
