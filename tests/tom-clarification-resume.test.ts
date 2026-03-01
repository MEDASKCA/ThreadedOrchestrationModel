import { describe, expect, it } from "vitest";
import { filterToolsByDomain, resolveClarificationDomainChoice } from "../lib/tom/reasoning/clarification";

describe("clarification resume", () => {
  it("resolves domain choice from text keywords", () => {
    const choice = resolveClarificationDomainChoice({
      message: "Please prioritise PTL first",
      domains: ["epr", "roster"],
    });
    expect(choice).toBe("epr");
  });

  it("returns unresolved when ambiguous", () => {
    const choice = resolveClarificationDomainChoice({
      message: "either works",
      domains: ["epr", "roster"],
    });
    expect(choice).toBeNull();
  });

  it("filters tools by selected domain", () => {
    const filtered = filterToolsByDomain([
      "epr.ptl_summary",
      "roster.staffing_summary",
    ], "roster");
    expect(filtered).toEqual(["roster.staffing_summary"]);
  });
});
