import { describe, expect, it } from "vitest";
import { VIEW_REGISTRY } from "../lib/tom/views/registry";

describe("view registry app coverage", () => {
  it("includes key pages across all primary sections", () => {
    const ids = new Set(VIEW_REGISTRY.map((v) => v.id));

    expect(ids.has("operations.ptl")).toBe(true);
    expect(ids.has("operations.cancer")).toBe(true);

    expect(ids.has("logistics.roster")).toBe(true);
    expect(ids.has("logistics.catalogue")).toBe(true);

    expect(ids.has("planning.schedule")).toBe(true);
    expect(ids.has("planning.staff_allocation")).toBe(true);

    expect(ids.has("collaboration.forum_all_threads")).toBe(true);
    expect(ids.has("collaboration.deliverables_team")).toBe(true);

    expect(ids.has("intelligence.analytics")).toBe(true);
    expect(ids.has("intelligence.tom_audit")).toBe(true);

    expect(ids.has("settings.integrations")).toBe(true);
    expect(ids.has("settings.profile")).toBe(true);
  });
});
