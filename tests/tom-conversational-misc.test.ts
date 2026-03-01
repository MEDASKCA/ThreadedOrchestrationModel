import { describe, expect, it } from "vitest";
import { buildConversationalMiscResponse } from "../lib/tom/reasoning/conversational-misc";

describe("conversational_misc world-chat response", () => {
  it("answers general cars question without app navigation menu", () => {
    const rich = buildConversationalMiscResponse("are you great with cars?");
    expect(/cars|bmw/i.test(rich.summary)).toBe(true);
    expect(rich.next_actions.length).toBe(0);
  });

  it("handles bmw query directly", () => {
    const rich = buildConversationalMiscResponse("do you know BMW?");
    expect(rich.summary.toLowerCase()).toContain("bmw");
    expect(rich.next_actions.length).toBe(0);
  });
});
