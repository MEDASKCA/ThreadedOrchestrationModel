import { describe, expect, it } from "vitest";
import { inferExploreSection, isExploreQuery, selectExploreViews } from "../lib/tom/reasoning/explore";

describe("explore reasoning helpers", () => {
  it("matches generic explore prompts", () => {
    expect(isExploreQuery("Can you show me any data you have?")).toBe(true);
  });

  it("infers section when provided", () => {
    expect(inferExploreSection("show me what you have in operations")).toBe("operations");
  });

  it("selects implemented views first", () => {
    const selected = selectExploreViews(
      [
        { id: "operations.unimplemented", label: "Backlog", section: "operations", implemented: false },
        { id: "operations.ptl", label: "PTL", section: "operations", implemented: true },
        { id: "operations.waiting", label: "Waiting", section: "operations", implemented: true },
      ],
      "operations",
    );
    expect(selected[0]).toBe("operations.ptl");
  });
});
