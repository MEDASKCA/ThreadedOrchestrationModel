import { describe, expect, it } from "vitest";
import { isAllowedInternalLink } from "../lib/tom/links";

describe("Link allowlist", () => {
  it("allows internal operations links", () => {
    expect(isAllowedInternalLink("/?section=operations&view=ptl")).toBe(true);
  });

  it("rejects non-operations links", () => {
    expect(isAllowedInternalLink("/?section=logistics&view=inventory")).toBe(false);
  });
});
