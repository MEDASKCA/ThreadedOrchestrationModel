import { describe, expect, it } from "vitest";
import { detectDomain } from "../lib/tom/reasoning/domain";

describe("domain detection", () => {
  it("detects app domain for operational terms", () => {
    expect(detectDomain("PTL summary")).toBe("app");
    expect(detectDomain("show roster shifts")).toBe("app");
  });

  it("detects general domain for non-app prompts", () => {
    expect(detectDomain("are you great with cars?")).toBe("general");
    expect(detectDomain("do you know BMW?")).toBe("general");
  });

  it("treats capabilities question as app domain", () => {
    expect(detectDomain("what can you do")).toBe("app");
  });
});

