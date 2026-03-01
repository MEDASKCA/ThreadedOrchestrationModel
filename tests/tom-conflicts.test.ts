import { describe, expect, it } from "vitest";
import { detectAuthorityConflicts } from "../lib/tom/reasoning/conflicts";
import { getAuthorityForTool } from "../lib/tom/reasoning/authority";

describe("authority conflicts", () => {
  it("detects multi-domain conflict for epr and roster tools", () => {
    const result = detectAuthorityConflicts([
      "epr.ptl_summary",
      "roster.staffing_summary",
    ], getAuthorityForTool);

    expect(result.domains).toEqual(["epr", "roster"]);
    expect(result.conflicts?.some((c) => c.kind === "multi_domain")).toBe(true);
  });

  it("does not flag multi-domain when one domain is selected", () => {
    const result = detectAuthorityConflicts(["epr.ptl_summary"], getAuthorityForTool);

    expect(result.domains).toEqual(["epr"]);
    expect(result.conflicts?.some((c) => c.kind === "multi_domain")).toBe(false);
  });
});
