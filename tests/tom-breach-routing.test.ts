import { describe, expect, it } from "vitest";
import { detectBreachQueryKind, isBreachTrackingQuery } from "../lib/tom/pages/breach-analyser";
import { normalizeBreachTrackingPage } from "../lib/tom/pages/breach-tracking";

describe("breach routing heuristics", () => {
  it("who is breaching routes to breach-tracking analyser", () => {
    expect(isBreachTrackingQuery("who is breaching?")).toBe(true);
    expect(detectBreachQueryKind("who is breaching?")).toBe("who");
  });

  it("has breach cases so generic fallback should not be needed", () => {
    const page = normalizeBreachTrackingPage({
      table: {
        rows: [{ patient: "Ava Long", specialty: "Cardiology", waiting_days: 120 }],
      },
    });
    expect(page.rows.length).toBeGreaterThan(0);
  });
});
