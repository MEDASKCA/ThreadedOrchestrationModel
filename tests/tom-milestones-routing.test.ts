import { describe, expect, it } from "vitest";
import { isMilestonesQuery } from "../lib/tom/pages/pathway-milestones-analyser";
import { normalizePathwayMilestonesPage } from "../lib/tom/pages/pathway-milestones";

describe("milestones routing heuristics", () => {
  it("where is the bottleneck routes to milestones analyser", () => {
    expect(isMilestonesQuery("where is the bottleneck?")).toBe(true);
  });

  it("rows present means generic fallback should not be needed", () => {
    const page = normalizePathwayMilestonesPage({
      table: { rows: [{ stage: "triage", count: 20, avg_wait: 12 }] },
    });
    expect(page.rows.length).toBeGreaterThan(0);
  });
});
