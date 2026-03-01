import { describe, expect, it } from "vitest";
import { applyConversationPattern } from "../lib/tom/narrative/patterns";

describe("conversation patterns", () => {
  const baseCtx = {
    intent: "operational_query",
    routing_path: "view_finder",
    tone: "friendly" as const,
    verbosity: "normal" as const,
    trace_id: "trace-pattern-abc",
  };

  it("adds an acknowledgement prefix for routed operational responses", () => {
    const shaped = applyConversationPattern({
      ctx: baseCtx,
      summary: "I reviewed the selected view and prepared the snapshot.",
      bullets: ["One", "Two", "Three", "Four"],
      next_actions: [],
    });
    expect(/^(Alright -|Got it -|Okay -|No problem -)\s/.test(shaped.summary)).toBe(true);
  });

  it("does not introduce digits in acknowledgement framing", () => {
    const shaped = applyConversationPattern({
      ctx: baseCtx,
      summary: "I reviewed the selected view and prepared the snapshot.",
      bullets: ["One"],
      next_actions: [],
    });
    expect(/\d/.test(shaped.summary)).toBe(false);
  });

  it("caps bullets for short verbosity", () => {
    const shaped = applyConversationPattern({
      ctx: { ...baseCtx, verbosity: "short" },
      summary: "I reviewed the selected view and prepared the snapshot.",
      bullets: ["One", "Two", "Three", "Four", "Five"],
      next_actions: [],
    });
    expect(shaped.bullets).toEqual(["One", "Two", "Three"]);
  });

  it("enforces a single question when a question is provided", () => {
    const shaped = applyConversationPattern({
      ctx: baseCtx,
      summary: "I can check planning? I can check collaboration?",
      question: "Which area should I prioritise first",
      bullets: ["One"],
      next_actions: [{ label: "Planning" }, { label: "Collaboration" }],
    });
    const questionCount = (shaped.summary.match(/\?/g) || []).length;
    expect(questionCount).toBe(1);
    expect(shaped.summary.endsWith("Which area should I prioritise first?")).toBe(true);
  });
});
