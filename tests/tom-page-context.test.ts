import { describe, expect, it } from "vitest";
import { getContext, updateContext } from "../lib/tom/context";

describe("page context", () => {
  it("stores page_context.updated_at on update", () => {
    const sessionId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const updatedAt = new Date().toISOString();

    updateContext(sessionId, {
      page_context: {
        section: "logistics",
        view: "roster_shifts",
        filters: { site: "Royal Infirmary" },
        deeplink: "/?section=logistics&view=roster_shifts",
        updated_at: updatedAt,
      },
    });

    const ctx = getContext(sessionId);
    expect(ctx.page_context?.updated_at).toBe(updatedAt);
    expect(ctx.page_context?.section).toBe("logistics");
  });
});
