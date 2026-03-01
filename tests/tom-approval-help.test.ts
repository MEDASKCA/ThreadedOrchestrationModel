import { describe, expect, it } from "vitest";
import { buildApprovalUserSummary, shouldRouteApprovalHelp } from "../lib/tom/governance/approval-describe";

describe("approval help routing", () => {
  it("routes approval help phrases only when pending approval exists", () => {
    const message = "what do you want me to confirm????";
    expect(shouldRouteApprovalHelp({ hasPendingApproval: true, message })).toBe(true);
    expect(shouldRouteApprovalHelp({ hasPendingApproval: false, message })).toBe(false);
  });

  it("builds a human-readable user_summary for approval prompts", () => {
    const summary = buildApprovalUserSummary({ type: "save_session_plan", payload: { target: "Planning" } });
    expect(summary).toContain("Save");
    expect(summary.toLowerCase()).toContain("plan");
  });
});
