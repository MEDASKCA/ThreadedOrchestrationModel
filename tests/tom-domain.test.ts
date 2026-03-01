import { describe, expect, it } from "vitest";
import { detectDomain } from "../lib/tom/reasoning/domain";

describe("domain detection", () => {
  it("returns general for non-app prompts", () => {
    expect(detectDomain("do you know BMW?")).toBe("general");
  });

  it("returns app for operational prompts", () => {
    expect(detectDomain("PTL snapshot")).toBe("app");
  });

  it("returns app for section open commands", () => {
    expect(detectDomain("open operations")).toBe("app");
  });
});
