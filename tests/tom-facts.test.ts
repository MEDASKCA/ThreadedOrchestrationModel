import { describe, expect, it } from "vitest";
import { buildAllowedFacts } from "../lib/tom/reasoning/facts";

describe("allowed facts", () => {
  it("builds stable unique ids from tools and evidence", () => {
    const facts = buildAllowedFacts({
      selectedTools: ["epr.ptl_summary"],
      evidence: [{ source: "epr.ptl_summary" }, { source: "roster.staffing_summary" }],
    });

    expect(facts.ids).toEqual([
      "tool:epr.ptl_summary",
      "evidence:epr.ptl_summary:0",
      "evidence:roster.staffing_summary:1",
    ]);
    expect(new Set(facts.ids).size).toBe(facts.ids.length);
  });
});
