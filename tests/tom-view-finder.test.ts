import { describe, expect, it } from "vitest";
import { findRelevantViews } from "../lib/tom/views/finder";
import { VIEW_REGISTRY } from "../lib/tom/views/registry";

describe("view finder", () => {
  it("returns planning/collaboration candidates for pending task prompts", () => {
    const candidates = findRelevantViews({
      message: "Do we have any pending tasks?",
      registry: VIEW_REGISTRY,
    });
    const topIds = candidates.slice(0, 5).map((candidate) => candidate.id);
    expect(topIds.some((id) => id.startsWith("planning."))).toBe(true);
    expect(topIds.some((id) => id.startsWith("collaboration."))).toBe(true);
  });

  it("returns logistics.inventory_stock for inventory prompts", () => {
    const candidates = findRelevantViews({
      message: "inventory status today",
      registry: VIEW_REGISTRY,
    });
    expect(candidates[0]?.id).toBe("logistics.inventory_stock");
  });

  it("sorts deterministically by score then registry order", () => {
    const candidates = findRelevantViews({
      message: "staff rota shift",
      registry: VIEW_REGISTRY,
    });
    for (let i = 1; i < candidates.length; i += 1) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });
});
