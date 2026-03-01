import { describe, expect, it } from "vitest";
import { getContract, selectToolsForMessage } from "../lib/tom/reasoning/tool-contracts";

describe("tool-contracts", () => {
  it("selects epr.ptl_summary for PTL summary", () => {
    const selected = selectToolsForMessage({ intent: "operational_query", message: "PTL summary" });
    expect(selected).toContain("epr.ptl_summary");
  });

  it("selects roster.staffing_summary for staffing prompts", () => {
    const selected = selectToolsForMessage({ intent: "staffing", message: "staffing today" });
    expect(selected).toContain("roster.staffing_summary");
  });

  it("returns no tools for smalltalk", () => {
    const contract = getContract("smalltalk");
    const selected = selectToolsForMessage({ intent: "smalltalk", message: "hello there" });
    expect(contract.allowedTools).toEqual([]);
    expect(selected).toEqual([]);
  });
});
