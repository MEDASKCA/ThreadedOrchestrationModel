import { describe, expect, it } from "vitest";
import { detectDataQualityQueryKind, isDataQualityQuery } from "../lib/tom/pages/data-quality-analyser";
import { normalizeValidationDataQualityPage } from "../lib/tom/pages/data-quality";

describe("data quality routing heuristics", () => {
  it("duplicate nhs query maps to validation/data-quality path", () => {
    expect(isDataQualityQuery("any duplicate nhs numbers?")).toBe(true);
    expect(detectDataQualityQueryKind("any duplicate nhs numbers?")).toBe("duplicate_nhs");
  });

  it("when data exists, generic fallback should not be needed", () => {
    const page = normalizeValidationDataQualityPage({
      table: {
        rows: [{ patient: "Ava Long", issue: "missing fields", owner: "Unassigned" }],
      },
    });
    expect(page.rows.length).toBeGreaterThan(0);
  });
});
