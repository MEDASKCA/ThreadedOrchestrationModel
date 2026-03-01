import { describe, expect, it } from "vitest";
import { normalizeWaitingListPage } from "../lib/tom/pages/waiting-list";
import {
  specialtiesWithCapacityGap,
  specialtyWithMaxAvgWait,
  totalWaiting,
} from "../lib/tom/pages/waiting-list-analyser";

describe("waiting list analyser", () => {
  it("uses total_waiting_list tile when present", () => {
    const page = normalizeWaitingListPage({
      metrics: { total_waiting: 120 },
      table: {
        rows: [
          { specialty: "General Surgery", total: 20, avg_wait: 320, slot_util: 70, capacity_gap: 12 },
          { specialty: "Cardiology", total: 30, avg_wait: 120, slot_util: 65, capacity_gap: 5 },
        ],
      },
    });
    expect(totalWaiting(page)).toBe(120);
  });

  it("falls back to row sum when tile missing", () => {
    const page = normalizeWaitingListPage({
      table: {
        rows: [
          { specialty: "General Surgery", total: 20, avg_wait: 320, slot_util: 70, capacity_gap: 12 },
          { specialty: "Cardiology", total: 30, avg_wait: 120, slot_util: 65, capacity_gap: 5 },
        ],
      },
    });
    expect(totalWaiting(page)).toBe(50);
  });

  it("finds specialty with max average wait", () => {
    const page = normalizeWaitingListPage({
      table: {
        rows: [
          { specialty: "General Surgery", total: 20, avg_wait: 320, slot_util: 70, capacity_gap: 12 },
          { specialty: "Cardiology", total: 30, avg_wait: 120, slot_util: 65, capacity_gap: 5 },
          { specialty: "ENT", total: 15, avg_wait: 95, slot_util: 80, capacity_gap: 0 },
        ],
      },
    });
    expect(specialtyWithMaxAvgWait(page)).toEqual({ specialty: "General Surgery", avg_wait_days: 320 });
  });

  it("returns only specialties with positive capacity gap", () => {
    const page = normalizeWaitingListPage({
      table: {
        rows: [
          { specialty: "General Surgery", total: 20, avg_wait: 320, slot_util: 70, capacity_gap: 12 },
          { specialty: "Cardiology", total: 30, avg_wait: 120, slot_util: 65, capacity_gap: 5 },
          { specialty: "ENT", total: 15, avg_wait: 95, slot_util: 80, capacity_gap: 0 },
        ],
      },
    });
    expect(specialtiesWithCapacityGap(page)).toEqual([
      { specialty: "General Surgery", capacity_gap: 12 },
      { specialty: "Cardiology", capacity_gap: 5 },
    ]);
  });
});
