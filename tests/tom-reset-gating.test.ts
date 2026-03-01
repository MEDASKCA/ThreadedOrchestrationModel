import { describe, expect, it } from "vitest";
import { isExplicitResetQuery } from "../lib/tom/reasoning/intent";

describe("reset gating", () => {
  it("triggers only on explicit reset phrases", () => {
    expect(isExplicitResetQuery("reset")).toBe(true);
    expect(isExplicitResetQuery("start over please")).toBe(true);
    expect(isExplicitResetQuery("forget it")).toBe(true);
    expect(isExplicitResetQuery("clear this")).toBe(true);
  });

  it("does not trigger on greetings/oops/complaints", () => {
    expect(isExplicitResetQuery("hello")).toBe(false);
    expect(isExplicitResetQuery("oops")).toBe(false);
    expect(isExplicitResetQuery("why do you keep saying the same thing")).toBe(false);
  });
});

