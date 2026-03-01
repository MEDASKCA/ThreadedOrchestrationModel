import { describe, expect, it } from "vitest";
import { buildConversationalMiscResponse } from "../lib/tom/reasoning/conversational-misc";

describe("conversational misc routing response", () => {
  it("builds a tool-free response with concise bullets and actions", () => {
    const rich = buildConversationalMiscResponse("how does ai work?");
    expect(rich.data_used).toEqual([]);
    expect(rich.sections[0]?.bullets.length).toBeGreaterThanOrEqual(2);
    expect(rich.sections[0]?.bullets.length).toBeLessThanOrEqual(4);
    expect(rich.next_actions.length).toBeGreaterThanOrEqual(2);
    expect(rich.next_actions.length).toBeLessThanOrEqual(4);
  });
});
