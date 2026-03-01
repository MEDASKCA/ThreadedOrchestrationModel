import { describe, expect, it } from "vitest";
import { normalizeClockStartsStopsPage } from "../lib/tom/pages/clock-events";
import {
  mostRecentAnomalies,
  summaryBullets,
  totalAnomalyRows,
} from "../lib/tom/pages/clock-events-analyser";

describe("clock events analyser", () => {
  const page = normalizeClockStartsStopsPage({
    metrics: {
      clock_start_anomalies: 5,
      manual_overrides: 2,
      duplicate_clocks: 1,
    },
    table: {
      rows: [
        { patient: "Ava Long", issue: "Missing clock start", clock_status: "stopped", last_activity: "2026-02-15T12:00:00Z" },
        { patient: "Ben North", issue: "Duplicate clock", clock_status: "running", last_activity: "2026-02-16T09:00:00Z" },
        { patient: "Cara West", issue: "Manual override", clock_status: "suspended", last_activity: "2026-02-14T20:00:00Z" },
      ],
    },
  });

  it("totalAnomalyRows matches rows length", () => {
    expect(totalAnomalyRows(page)).toBe(3);
  });

  it("mostRecentAnomalies sorts correctly", () => {
    expect(mostRecentAnomalies(page, 2).map((row) => row.patient_name)).toEqual(["Ben North", "Ava Long"]);
  });

  it("summaryBullets uses only present fields", () => {
    const bullets = summaryBullets(page);
    expect(bullets).toContain("Clock start anomalies: 5");
    expect(bullets).toContain("Manual overrides: 2");
    expect(bullets).toContain("Duplicate clocks: 1");
    expect(bullets.some((line) => line.startsWith("Most recent issue:"))).toBe(true);
  });
});
