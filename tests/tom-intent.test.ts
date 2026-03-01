import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";

describe("TOM intent classifier", () => {
  it("detects smalltalk", () => {
    expect(classifyIntent("how are you?")).toBe("smalltalk");
  });

  it("detects staffing", () => {
    expect(classifyIntent("show staffing gaps")).toBe("staffing");
  });

  it("detects operational queries", () => {
    expect(classifyIntent("ptl summary")).toBe("operational_query");
  });

  it("detects governance queries", () => {
    expect(classifyIntent("why are we breaching")).toBe("governance_query");
  });
});
