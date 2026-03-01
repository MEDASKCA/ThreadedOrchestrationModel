import { describe, expect, it } from "vitest";
import { normalizeTriageStatusPage } from "../lib/tom/pages/triage";
import {
  longestWaiting,
  summaryBullets,
  urgentItems,
} from "../lib/tom/pages/triage-analyser";

describe("triage analyser", () => {
  const page = normalizeTriageStatusPage({
    metrics: {
      awaiting_consultant_review: 9,
      overdue_triage: 4,
      clarification_requested: 2,
      reprioritization_pending: 1,
    },
    rows: [
      { patient_name: "Ava Long", consultant: "Dr A", waiting_days: 44, priority: "urgent", rtt_status: "at risk", state: "overdue triage" },
      { patient_name: "Ben North", consultant: "Dr B", waiting_days: 12, priority: "routine", rtt_status: "on track", state: "awaiting consultant review" },
      { patient_name: "Cara West", consultant: "Dr C", waiting_days: 31, priority: "urgent", rtt_status: "breaching", state: "reprioritization pending" },
    ],
  });

  it("longestWaiting returns max waiting_days", () => {
    expect(longestWaiting(page)).toEqual({
      patient_name: "Ava Long",
      waiting_days: 44,
      consultant: "Dr A",
    });
  });

  it("urgentItems filters correctly", () => {
    expect(urgentItems(page).map((row) => row.patient_name)).toEqual(["Ava Long", "Cara West"]);
  });

  it("summaryBullets uses only present tiles/rows", () => {
    const bullets = summaryBullets(page);
    expect(bullets).toContain("Awaiting consultant review: 9");
    expect(bullets).toContain("Overdue triage: 4");
    expect(bullets.some((line) => line.includes("Oldest pending item: Ava Long (44d)"))).toBe(true);
    expect(bullets.length).toBeLessThanOrEqual(3);
  });
});
