import { describe, expect, it } from "vitest";
import { buildPendingSummary } from "../lib/tom/views/pending";

describe("pending summary", () => {
  it("builds deterministic counts and bullets", () => {
    const result = buildPendingSummary({
      planning: {
        sessions: { items: [{ id: "s1", date: "2099-01-01" }, { id: "s2", date: "2099-01-02" }] },
        roster_shifts: { items: [{ id: "r1", assigned: false }, { id: "r2", assigned: true }] },
      },
      collaboration: {
        deliverables: { items: [{ id: "d1", status: "open" }, { id: "d2", status: "resolved" }] },
        forum: { items: [{ id: "f1", is_active: true }, { id: "f2", is_active: false }] },
      },
    });

    expect(result.counts.planning_sessions).toBe(2);
    expect(result.counts.roster_shifts).toBe(1);
    expect(result.counts.collaboration_deliverables).toBe(1);
    expect(result.counts.collaboration_forum).toBe(1);
    expect(result.bullets).toContain("Planning: 2 sessions");
    expect(result.bullets).toContain("Collaboration: 1 deliverables");
  });
});
