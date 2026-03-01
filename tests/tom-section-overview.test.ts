import { describe, expect, it } from "vitest";
import { buildSectionOverview } from "../lib/tom/views/overview";

describe("section overview builder", () => {
  it("returns bullets and actions for matching section views", () => {
    const result = buildSectionOverview({
      section: "operations",
      registry: [
        { id: "operations.ptl", section: "operations", label: "PTL", implemented: true },
        { id: "operations.waiting", section: "operations", label: "Waiting", implemented: true },
        { id: "operations.rtt", section: "operations", label: "RTT", implemented: false },
        { id: "logistics.roster_shifts", section: "logistics", label: "Roster", implemented: true },
      ],
    });

    expect(result.title).toBe("Operations overview");
    expect(result.bullets.length).toBeGreaterThan(0);
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.actions.some((action) => action.payload?.type === "open_view")).toBe(true);
    expect(result.actions.some((action) => action.payload?.type === "open_canvas")).toBe(true);
  });
});
