import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";

describe("section overview intent", () => {
  it("classifies section overview queries for operations", () => {
    expect(classifyIntent("tell me about operations")).toBe("section_overview");
  });
});
