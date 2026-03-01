import { describe, expect, it } from "vitest";
import type { PTLRow } from "../lib/tom/pages/ptl";
import {
  countByStatus,
  countPatients,
  findBreaches,
  findLongestWaiter,
  findUrgentBreaches,
  groupByPriority,
} from "../lib/tom/pages/ptl-analyser";

const rows: PTLRow[] = [
  {
    patient_name: "Marcus Osei",
    nhs_number: "1111111111",
    age: 59,
    priority: "urgent",
    specialty: "General Surgery",
    waiting_days: 320,
    rtt_target_weeks: 18,
    rtt_status: "breaching",
  },
  {
    patient_name: "Amy Reed",
    nhs_number: "2222222222",
    age: 46,
    priority: "routine",
    specialty: "Orthopaedics",
    waiting_days: 90,
    rtt_target_weeks: 18,
    rtt_status: "on_track",
  },
  {
    patient_name: "Lina Shah",
    nhs_number: "3333333333",
    age: 38,
    priority: "expedited",
    specialty: "ENT",
    waiting_days: 210,
    rtt_target_weeks: 18,
    rtt_status: "breaching",
  },
];

describe("ptl analyser", () => {
  it("finds longest waiter deterministically", () => {
    const longest = findLongestWaiter(rows);
    expect(longest?.patient_name).toBe("Marcus Osei");
    expect(longest?.waiting_days).toBe(320);
  });

  it("counts breaches from rows", () => {
    const breaches = findBreaches(rows);
    expect(breaches.length).toBe(2);
    expect(countByStatus(rows).breaching).toBe(2);
  });

  it("detects urgent breaches", () => {
    const urgentBreaches = findUrgentBreaches(rows);
    expect(urgentBreaches.length).toBe(1);
    expect(urgentBreaches[0].patient_name).toBe("Marcus Osei");
  });

  it("groups priorities and counts totals", () => {
    const grouped = groupByPriority(rows);
    expect(grouped.urgent).toHaveLength(1);
    expect(grouped.routine).toHaveLength(1);
    expect(grouped.expedited).toHaveLength(1);
    expect(countPatients(rows)).toBe(3);
  });
});
