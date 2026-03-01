import { describe, expect, it } from "vitest";
import { getContext, updateContext } from "../lib/tom/context";
import { buildContinueActionFromTopic } from "../lib/tom/reasoning/continuity";

describe("continuity", () => {
  it("stores last_topic in context", () => {
    const sessionId = "continuity-test-session";
    updateContext(sessionId, {
      last_topic: {
        kind: "view",
        id: "operations.ptl",
        label: "PTL",
        updated_at: new Date().toISOString(),
      },
    });
    const ctx = getContext(sessionId);
    expect(ctx.last_topic?.id).toBe("operations.ptl");
  });

  it("builds continue action from last_topic", () => {
    const action = buildContinueActionFromTopic({
      kind: "view",
      id: "operations.ptl",
      label: "PTL",
      updated_at: new Date().toISOString(),
    });
    expect(action?.label).toContain("Continue");
    expect(action?.payload?.type).toBe("open_view");
  });
});

