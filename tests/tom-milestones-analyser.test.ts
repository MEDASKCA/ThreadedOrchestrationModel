import { describe, expect, it } from "vitest";
import { normalizePathwayMilestonesPage } from "../lib/tom/pages/pathway-milestones";
import {
  bottleneckStages,
  longestStage,
  stageDistribution,
} from "../lib/tom/pages/pathway-milestones-analyser";

describe("pathway milestones analyser", () => {
  const page = normalizePathwayMilestonesPage({
    table: {
      rows: [
        { stage: "triage", count: 20, avg_wait: 12 },
        { stage: "diagnostics", count: 10, avg_wait: 28 },
        { stage: "scheduled", count: 30, avg_wait: 6 },
      ],
    },
  });

  it("longestStage returns max avg_wait_days", () => {
    expect(longestStage(page)).toEqual({
      stage: "diagnostics",
      count: 10,
      avg_wait_days: 28,
    });
  });

  it("stageDistribution counts correctly", () => {
    expect(stageDistribution(page)).toEqual([
      { stage: "scheduled", count: 30 },
      { stage: "triage", count: 20 },
      { stage: "diagnostics", count: 10 },
    ]);
  });

  it("bottleneckStages returns top 2 by avg_wait_days", () => {
    expect(bottleneckStages(page).map((row) => row.stage)).toEqual(["diagnostics", "triage"]);
  });
});
