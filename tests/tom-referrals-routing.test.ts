import { describe, expect, it } from "vitest";
import {
  detectReferralQueryKind,
  isReferralQuery,
  pipelineCounts,
} from "../lib/tom/pages/referrals-analyser";
import { normalizeReferralManagementPage } from "../lib/tom/pages/referrals";

describe("referrals routing heuristics", () => {
  it("overdue triage query maps to referral-management analyser path", () => {
    expect(isReferralQuery("any overdue triage?")).toBe(true);
    expect(detectReferralQueryKind("any overdue triage?")).toBe("overdue_triage");
  });

  it("returns overdue triage tile when present", () => {
    const page = normalizeReferralManagementPage({
      metrics: { overdue_triage: 4, awaiting_triage: 7 },
      table: { rows: [] },
    });
    const counts = pipelineCounts(page);
    expect(counts.overdue_triage).toBe(4);
  });

  it("does not classify unrelated text as referral query", () => {
    expect(isReferralQuery("hello team")).toBe(false);
  });
});
