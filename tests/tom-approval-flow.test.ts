import { describe, expect, it } from "vitest";
import { normalizeApprovalChoice } from "../lib/tom/governance/approval";

describe("approval flow helpers", () => {
  it("normalizes positive approvals", () => {
    expect(normalizeApprovalChoice("yes")).toBe("approve");
    expect(normalizeApprovalChoice("confirm")).toBe("approve");
  });

  it("normalizes denials", () => {
    expect(normalizeApprovalChoice("no")).toBe("deny");
    expect(normalizeApprovalChoice("cancel")).toBe("deny");
  });

  it("returns unknown for unrelated text", () => {
    expect(normalizeApprovalChoice("maybe later")).toBe("unknown");
  });
});
