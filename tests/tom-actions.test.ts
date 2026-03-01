import { describe, expect, it } from "vitest";
import { runTruthFirewall } from "../lib/tom/truth-firewall";

describe("TOM actions", () => {
  it("generates confirmable actions", async () => {
    const result = await runTruthFirewall({
      prompt: "ptl summary",
      context: { connectedSources: [], missingSources: ["EPR"] },
    });
    expect(result.permitted_actions.length).toBeGreaterThan(0);
    expect(result.permitted_actions[0].action_id).toBeTruthy();
  });
});
