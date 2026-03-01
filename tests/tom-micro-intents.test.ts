import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";

describe("micro intents", () => {
  it("classifies greeting", () => {
    expect(classifyIntent("greetings!")).toBe("greeting");
    expect(classifyIntent("hello")).toBe("greeting");
  });

  it("classifies typo_oops", () => {
    expect(classifyIntent("oops")).toBe("typo_oops");
    expect(classifyIntent("sorry, ignore that")).toBe("typo_oops");
  });

  it("classifies repetition complaint", () => {
    expect(classifyIntent("why do you keep saying the same thing")).toBe("repetition_complaint");
    expect(classifyIntent("this is robotic again")).toBe("repetition_complaint");
  });
});

