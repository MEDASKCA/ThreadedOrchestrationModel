import { describe, expect, it } from "vitest";
import { normalizeBreachTrackingPage } from "../lib/tom/pages/breach-tracking";
import {
  breachesBySpecialty,
  longestBreach,
  totalBreaches,
  unassignedBreaches,
} from "../lib/tom/pages/breach-analyser";

describe("breach analyser", () => {
  const page = normalizeBreachTrackingPage({
    metrics: {
      breaches_by_specialty: 3,
      repeat_breach_cases: 1,
      weekly_trend: 3,
    },
    table: {
      rows: [
        { patient: "Ava Long", specialty: "Cardiology", waiting_days: 120, cause: "Diagnostics delay", owner: "Unassigned" },
        { patient: "Ben North", specialty: "Cardiology", waiting_days: 80, cause: "Capacity", owner: "Ops Lead" },
        { patient: "Cara West", specialty: "General Surgery", waiting_days: 95, cause: "Diagnostics delay", owner: "" },
      ],
    },
  });

  it("totalBreaches equals rows length", () => {
    expect(totalBreaches(page)).toBe(3);
  });

  it("longestBreach returns max waiting_days", () => {
    expect(longestBreach(page)?.patient_name).toBe("Ava Long");
    expect(longestBreach(page)?.waiting_days).toBe(120);
  });

  it("breachesBySpecialty counts correctly", () => {
    expect(breachesBySpecialty(page)).toEqual([
      { specialty: "Cardiology", count: 2 },
      { specialty: "General Surgery", count: 1 },
    ]);
  });

  it("unassignedBreaches filters missing/unassigned owners", () => {
    expect(unassignedBreaches(page).map((row) => row.patient_name)).toEqual(["Ava Long", "Cara West"]);
  });
});
