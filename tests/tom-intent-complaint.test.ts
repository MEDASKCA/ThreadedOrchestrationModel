import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";

describe("complaint intent routing", () => {
  it("classifies complaint text as meta_feedback", () => {
    expect(classifyIntent("your answer is irrelevant")).toBe("meta_feedback");
  });

  it("classifies nonsense complaint as meta_feedback", () => {
    expect(classifyIntent("that does not make sense")).toBe("meta_feedback");
  });
});
