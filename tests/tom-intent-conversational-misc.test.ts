import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";

describe("conversational_misc intent", () => {
  it("classifies general AI question as conversational_misc", () => {
    expect(classifyIntent("how much does chatgpt know")).toBe("conversational_misc");
  });

  it("keeps capability question in app-capability flow", () => {
    expect(classifyIntent("what can you do")).toBe("smalltalk");
  });

  it("classifies weather question as conversational_misc", () => {
    expect(classifyIntent("do you know the weather tomorrow?")).toBe("conversational_misc");
  });
});
