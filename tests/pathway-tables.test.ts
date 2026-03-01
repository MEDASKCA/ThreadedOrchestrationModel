import { describe, expect, it } from "vitest";
import { buildWaitingListTable } from "../lib/pathways/tables";
import { pathwayFixtures } from "../lib/pathways/fixtures";

describe("Pathway tables", () => {
  it("builds waiting list table", () => {
    const table = buildWaitingListTable(pathwayFixtures);
    expect(table.columns.length).toBeGreaterThan(0);
    expect(table.rows.length).toBeGreaterThan(0);
  });
});
