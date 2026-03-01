import { describe, expect, it } from "vitest";
import { isRttComplianceQuestion } from "../lib/tom/pages/rtt-analyser";

describe("rtt routing heuristics", () => {
  it("routes 18-week breach question to RTT analyser", () => {
    expect(isRttComplianceQuestion("Are we breaching 18 weeks?")).toBe(true);
  });

  it("routes RTT compliance language to RTT analyser", () => {
    expect(isRttComplianceQuestion("Are we compliant on RTT within target?")).toBe(true);
  });

  it("does not classify neutral text as RTT", () => {
    expect(isRttComplianceQuestion("hello there")).toBe(false);
  });
});
