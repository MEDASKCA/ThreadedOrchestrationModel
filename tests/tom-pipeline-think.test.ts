import { describe, expect, it } from "vitest";
import { buildThinkPlan } from "../lib/tom/reasoning/pipeline";
import { VIEW_REGISTRY } from "../lib/tom/views/registry";
import { findRelevantViews } from "../lib/tom/views/finder";
import { classifyIntent } from "../lib/tom/reasoning/intent";

describe("deep reasoning think plan", () => {
  it("builds read_views plan for longest waiter", async () => {
    const plan = await buildThinkPlan({
      message: "who is our longest waiter?",
      viewRegistry: VIEW_REGISTRY,
      findRelevantViews,
      classifyIntent,
    });
    const readStep = plan.steps.find((step) => step.kind === "read_views");
    expect(readStep).toBeTruthy();
    if (!readStep || !("view_ids" in readStep)) {
      throw new Error("Expected read_views step");
    }
    expect(readStep.view_ids).toContain("operations.access_pathways_waiting_list");
  });

  it("builds clarify step for unsupported domain words when no viable candidates", async () => {
    const registry = VIEW_REGISTRY.map((view) => ({ ...view, implemented: false }));
    const plan = await buildThinkPlan({
      message: "forums trending",
      viewRegistry: registry,
      findRelevantViews,
      classifyIntent,
    });
    expect(plan.steps[0]?.kind).toBe("clarify");
  });
});
