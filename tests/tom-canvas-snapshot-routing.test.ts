import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";
import { getContract } from "../lib/tom/reasoning/tool-contracts";

describe("canvas snapshot routing", () => {
  it("classifies show-on-canvas prompts", () => {
    expect(classifyIntent("show it on canvas")).toBe("show_in_canvas");
  });

  it("show_in_canvas contract uses no tools", () => {
    expect(getContract("show_in_canvas").allowedTools).toEqual([]);
  });
});
