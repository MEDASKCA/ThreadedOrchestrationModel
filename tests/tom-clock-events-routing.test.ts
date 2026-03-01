import { describe, expect, it } from "vitest";
import {
  detectClockEventsQueryKind,
  isClockEventsQuery,
} from "../lib/tom/pages/clock-events-analyser";
import { normalizeClockStartsStopsPage } from "../lib/tom/pages/clock-events";

describe("clock events routing heuristics", () => {
  it("manual override query maps to clock starts/stops path", () => {
    expect(isClockEventsQuery("any manual overrides?")).toBe(true);
    expect(detectClockEventsQueryKind("any manual overrides?")).toBe("manual_overrides");
  });

  it("when data exists, generic fallback should not be needed", () => {
    const page = normalizeClockStartsStopsPage({
      table: {
        rows: [{ patient: "Ava Long", issue: "Missing clock start" }],
      },
    });
    expect(page.rows.length).toBeGreaterThan(0);
  });
});
