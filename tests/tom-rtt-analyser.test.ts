import { describe, expect, it } from "vitest";
import { normalizeRTTPage } from "../lib/tom/pages/rtt";
import {
  overallCompliance,
  specialtyWithLowestCompliance,
  specialtyWithMostBreaches,
} from "../lib/tom/pages/rtt-analyser";

describe("rtt analyser", () => {
  const page = normalizeRTTPage({
    metrics: {
      within_18_weeks: 61,
      breach_52: 3,
      avg_wait: 128,
      median_wait: 102,
      trend_12w: 126,
      forecast_breaches: 4,
    },
    table: {
      rows: [
        { specialty: "Cardiology", within_18: 0, breach_52: 1, avg_wait: 188, median_wait: 160 },
        { specialty: "General Surgery", within_18: 42, breach_52: 3, avg_wait: 151, median_wait: 129 },
        { specialty: "ENT", within_18: 78, breach_52: 0, avg_wait: 94, median_wait: 80 },
      ],
    },
  });

  it("returns overall compliance from tile", () => {
    expect(overallCompliance(page)).toBe(61);
  });

  it("finds lowest compliance specialty", () => {
    expect(specialtyWithLowestCompliance(page)).toEqual({
      specialty: "Cardiology",
      percent_within_18w: 0,
    });
  });

  it("finds specialty with most 52-week breaches", () => {
    expect(specialtyWithMostBreaches(page)).toEqual({
      specialty: "General Surgery",
      breaches_52w: 3,
    });
  });
});
