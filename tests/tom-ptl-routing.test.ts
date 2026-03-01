import { describe, expect, it } from "vitest";
import { detectPtlQueryKind, isPtlOperationalQuestion } from "../lib/tom/pages/ptl-analyser";

describe("ptl routing heuristics", () => {
  it("routes PTL questions to analyser kinds", () => {
    expect(isPtlOperationalQuestion("How many are waiting?")).toBe(true);
    expect(detectPtlQueryKind("How many are waiting?")).toBe("count");

    expect(isPtlOperationalQuestion("Who is longest waiter?")).toBe(true);
    expect(detectPtlQueryKind("Who is longest waiter?")).toBe("longest_waiter");

    expect(isPtlOperationalQuestion("Any breaches on PTL?")).toBe(true);
    expect(detectPtlQueryKind("Any breaches on PTL?")).toBe("breaches");
  });

  it("does not use generic unknown for PTL-relevant prompts", () => {
    expect(detectPtlQueryKind("Who is longest waiter?")).not.toBe("unknown");
  });
});
