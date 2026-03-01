import { describe, expect, it } from "vitest";
import { VOICE_VARIANTS, pickVariant, voiceClarifyQuestion, voiceIntro } from "../lib/tom/narrative/voice";

describe("voice layer", () => {
  it("pickVariant is deterministic for the same trace_id", () => {
    const variants = ["alpha", "beta", "gamma"];
    const a = pickVariant("trace-abc-123", variants);
    const b = pickVariant("trace-abc-123", variants);
    expect(a).toBe(b);
  });

  it("voiceIntro picks a valid variant and contains no digits", () => {
    const intro = voiceIntro({
      tone: "friendly",
      verbosity: "normal",
      routing_path: "pending_override",
      intent: "operational_query",
      trace_id: "trace-sample-no-digits",
    });
    expect(VOICE_VARIANTS.pending_work.includes(intro)).toBe(true);
    expect(/\d/.test(intro)).toBe(false);
  });

  it("voiceClarifyQuestion wraps base question deterministically", () => {
    const out = voiceClarifyQuestion({
      tone: "friendly",
      verbosity: "normal",
      routing_path: "metric_clarify",
      intent: "operational_query",
      trace_id: "trace-clarify-1",
    }, "Which area should I prioritise first?");
    expect(out.includes("{{question}}")).toBe(false);
    expect(out.endsWith("?")).toBe(true);
  });
});
