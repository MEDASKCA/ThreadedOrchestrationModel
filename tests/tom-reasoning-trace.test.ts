import { describe, expect, it } from "vitest";
import { createTraceBase } from "../lib/tom/reasoning/trace";

describe("ReasoningTrace", () => {
  it("creates a base trace with required fields", () => {
    const trace = createTraceBase({
      user_message: "ptl summary",
      intent: "operational_query",
      intent_confidence: 0.8,
    });

    expect(trace.trace_id).toBeTruthy();
    expect(trace.created_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(trace.user_message).toBe("ptl summary");
    expect(trace.intent).toBe("operational_query");
    expect(trace.intent_confidence).toBeCloseTo(0.8);
    expect(trace.constraints).toEqual([]);
    expect(trace.ambiguity).toEqual({ score: 0, reasons: [] });
    expect(trace.plan).toEqual({ steps: [] });
    expect(trace.route.mode).toBe("deterministic");
    expect(trace.verification).toEqual({ required: false, rules: [] });
    expect(trace.allowed_facts).toEqual({ ids: [] });
  });
});
