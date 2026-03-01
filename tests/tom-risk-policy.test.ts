import { describe, expect, it } from "vitest";
import { assessActionRisk } from "../lib/tom/governance/risk";

describe("risk policy", () => {
  it("assesses open_view as low risk without approval", () => {
    const decision = assessActionRisk({ type: "open_view" });
    expect(decision.risk).toBe("low");
    expect(decision.requires_approval).toBe(false);
  });

  it("assesses update_session as high risk with approval", () => {
    const decision = assessActionRisk({ type: "update_session" });
    expect(decision.risk).toBe("high");
    expect(decision.requires_approval).toBe(true);
  });
});
