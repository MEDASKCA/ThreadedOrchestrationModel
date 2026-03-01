import { describe, expect, it } from "vitest";
import { buildAllowedNumbers, responseContainsUnknownNumbers, dedupeSources } from "../lib/tom/grounding";

describe("TOM grounding utilities", () => {
  it("detects unknown numbers", () => {
    const allowed = buildAllowedNumbers([1, 2, 5]);
    expect(responseContainsUnknownNumbers("Counts are 1 and 2.", allowed)).toBe(false);
    expect(responseContainsUnknownNumbers("Counts are 1 and 7.", allowed)).toBe(true);
  });

  it("deduplicates sources", () => {
    const sources = dedupeSources([
      { source: "EPR", label: "A", value: 1 },
      { source: "EPR", label: "B", value: 2 },
      { source: "Alerts", label: "C", value: 3 },
    ]);
    expect(sources).toEqual(["EPR", "Alerts"]);
  });
});
