import { describe, expect, it } from "vitest";
import { computeConfidence, type DataUsed } from "../lib/tom/reasoning/engine";

describe("TOM confidence scoring", () => {
  it("returns low confidence with no numeric evidence", () => {
    const data: DataUsed[] = [{ source: "TOM", label: "Connected sources", value: "None" }];
    const confidence = computeConfidence(data, "operational_query");
    expect(confidence.level).toBe("low");
  });

  it("returns high confidence with multiple numeric sources", () => {
    const data: DataUsed[] = [
      { source: "EPR", label: "Breaching", value: 12 },
      { source: "EPR", label: "At risk", value: 6 },
      { source: "Alerts", label: "Active alerts", value: 3 },
    ];
    const confidence = computeConfidence(data, "operational_query");
    expect(confidence.level).toBe("high");
  });
});
