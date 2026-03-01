import { describe, expect, it } from "vitest";
import { normalizeReferralManagementPage } from "../lib/tom/pages/referrals";
import {
  longestWaitingReferral,
  referralsBySpecialty,
  summaryBullets,
} from "../lib/tom/pages/referrals-analyser";

describe("referrals analyser", () => {
  const page = normalizeReferralManagementPage({
    metrics: {
      new_referrals: 12,
      awaiting_triage: 6,
      overdue_triage: 3,
      conversion_rate: 72,
    },
    table: {
      rows: [
        { patient: "Ava Long", specialty: "Cardiology", consultant: "Dr A", waiting_days: 44, status: "at risk" },
        { patient: "Ben North", specialty: "Cardiology", consultant: "Dr A", waiting_days: 10, status: "on track" },
        { patient: "Cara West", specialty: "General Surgery", consultant: "Dr B", waiting_days: 31, status: "breaching" },
      ],
    },
  });

  it("longestWaitingReferral picks max waiting_days", () => {
    expect(longestWaitingReferral(page)).toEqual({
      patient_name: "Ava Long",
      waiting_days: 44,
      specialty: "Cardiology",
    });
  });

  it("referralsBySpecialty counts correctly", () => {
    expect(referralsBySpecialty(page)).toEqual([
      { specialty: "Cardiology", count: 2 },
      { specialty: "General Surgery", count: 1 },
    ]);
  });

  it("summaryBullets uses only present tiles/rows", () => {
    const bullets = summaryBullets(page);
    expect(bullets).toContain("Overdue triage: 3");
    expect(bullets).toContain("Awaiting triage: 6");
    expect(bullets.some((line) => line.includes("Longest referral wait: Ava Long (44d)"))).toBe(true);
    expect(bullets.length).toBeLessThanOrEqual(3);
  });
});
