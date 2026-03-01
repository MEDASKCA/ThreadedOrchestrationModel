import { describe, expect, it } from "vitest";
import { getAuthorityForTool } from "../lib/tom/reasoning/authority";

describe("authority", () => {
  it("maps roster staffing tool to roster authority", () => {
    expect(getAuthorityForTool("roster.staffing_summary")).toBe("roster");
  });

  it("maps epr ptl tool to epr authority", () => {
    expect(getAuthorityForTool("epr.ptl_summary")).toBe("epr");
  });
});
