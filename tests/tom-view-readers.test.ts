import { describe, expect, it } from "vitest";
import { read as readTheatreSchedule } from "../lib/tom/views/readers/logistics.theatre_schedule";

describe("view readers", () => {
  it("returns standardized view evidence", async () => {
    const result = await readTheatreSchedule({ filters: { site: "Royal Infirmary" } });
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence[0]?.source?.startsWith("view.read:")).toBe(true);
    expect(result.evidence[0]?.kind).toBeTruthy();
    expect(result.evidence[0]?.fetched_at).toBeTruthy();
    expect(result.evidence[0]?.inputs?.view_id).toBe("logistics.theatre_schedule");
  });
});
