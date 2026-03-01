import { describe, expect, it } from "vitest";
import { VIEW_REGISTRY } from "../lib/tom/views/registry";

describe("implemented view registry coverage", () => {
  it("has at least 6 implemented views", () => {
    const implemented = VIEW_REGISTRY.filter((view) => view.implemented).length;
    expect(implemented).toBeGreaterThanOrEqual(6);
  });
});
