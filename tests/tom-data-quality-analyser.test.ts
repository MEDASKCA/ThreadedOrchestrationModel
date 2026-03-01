import { describe, expect, it } from "vitest";
import { normalizeValidationDataQualityPage } from "../lib/tom/pages/data-quality";
import {
  summaryBullets,
  totalIssueRows,
  unassignedRecords,
} from "../lib/tom/pages/data-quality-analyser";

describe("data quality analyser", () => {
  const page = normalizeValidationDataQualityPage({
    metrics: {
      validation_overdue: 5,
      never_validated: 3,
      no_owner_assigned: 2,
    },
    table: {
      rows: [
        { patient: "Ava Long", issue: "missing fields", owner: "Unassigned", last_activity: "2026-02-18T09:00:00Z" },
        { patient: "Ben North", issue: "duplicate nhs", owner: "", last_activity: "2026-02-17T09:00:00Z" },
        { patient: "Cara West", issue: "ghost pathway", owner: "Ops Lead", last_activity: "2026-02-16T09:00:00Z" },
      ],
    },
  });

  it("totalIssueRows equals rows.length", () => {
    expect(totalIssueRows(page)).toBe(3);
  });

  it("unassignedRecords filters correctly", () => {
    expect(unassignedRecords(page).map((row) => row.patient_name)).toEqual(["Ava Long", "Ben North"]);
  });

  it("summaryBullets uses only present fields", () => {
    const bullets = summaryBullets(page);
    expect(bullets).toContain("Validation overdue: 5");
    expect(bullets).toContain("Never validated: 3");
    expect(bullets).toContain("No owner assigned: 2");
    expect(bullets.some((line) => line.startsWith("Most recent issue:"))).toBe(true);
  });
});
