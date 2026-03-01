import { describe, expect, it } from "vitest";
import { resolveEmotionActionRoute } from "../lib/tom/reasoning/emotion";

describe("emotion action routing", () => {
  it("routes Operations to section_overview operations", () => {
    expect(resolveEmotionActionRoute("Operations")).toBe("operations_overview");
  });

  it("routes Show something useful to explore_mode", () => {
    expect(resolveEmotionActionRoute("Show something useful")).toBe("explore_mode");
  });
});
