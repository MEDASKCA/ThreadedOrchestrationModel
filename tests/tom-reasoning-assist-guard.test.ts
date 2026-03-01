import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { REASONING_ASSIST_DENYLIST, reasoningAssistRewrite, shouldUseReasoningAssist } from "../lib/tom/llm/reasoning-assist";

describe("reasoning assist guards", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("does not call OpenAI when flag is disabled", async () => {
    process.env.TOM_REASONING_ASSIST = "false";
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof global.fetch;

    const output = await reasoningAssistRewrite({
      message: "are you there?",
      intent: "presence_ping",
      routing_path: "conversational_misc",
      base: { summary: "Tell me what you want to do next." },
    });

    expect(output).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("denylist blocks only structural routing paths", () => {
    process.env.TOM_REASONING_ASSIST = "true";
    process.env.OPENAI_API_KEY = "test-key";
    // Structural flows should be blocked
    expect(REASONING_ASSIST_DENYLIST.has("approval_gate")).toBe(true);
    expect(REASONING_ASSIST_DENYLIST.has("typo_oops")).toBe(true);
    // Operational and conversational flows should now be allowed
    expect(REASONING_ASSIST_DENYLIST.has("conversational_default")).toBe(false);
    expect(REASONING_ASSIST_DENYLIST.has("section_overview")).toBe(false);
    expect(REASONING_ASSIST_DENYLIST.has("operational_query")).toBe(false);
  });

  it("enables reasoning assist for operational queries", () => {
    process.env.TOM_REASONING_ASSIST = "true";
    process.env.OPENAI_API_KEY = "test-key";
    // Operational queries should now get LLM polish
    expect(shouldUseReasoningAssist({ routingPath: "conversational_default" })).toBe(true);
    expect(shouldUseReasoningAssist({ routingPath: "operational_query" })).toBe(true);
    expect(shouldUseReasoningAssist({ routingPath: "section_overview" })).toBe(true);
    // Structural flows should still be skipped
    expect(shouldUseReasoningAssist({ routingPath: "approval_gate" })).toBe(false);
    expect(shouldUseReasoningAssist({ routingPath: "typo_oops" })).toBe(false);
  });
});
