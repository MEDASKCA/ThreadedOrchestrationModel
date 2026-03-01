import { describe, expect, it } from "vitest";
import { isExplainRequest } from "../lib/tom/reasoning/explain-trigger";

describe("explain trigger", () => {
  it("detects explicit explanation requests", () => {
    expect(isExplainRequest("why?")).toBe(true);
    expect(isExplainRequest("explain this")).toBe(true);
    expect(isExplainRequest("how did you get that")).toBe(true);
    expect(isExplainRequest("show your working")).toBe(true);
  });

  it("does not trigger on unrelated words", () => {
    expect(isExplainRequest("whydah is a place name")).toBe(false);
    expect(isExplainRequest("this is fine")).toBe(false);
  });
});
