import { describe, expect, it } from "vitest";
import { VIEW_REGISTRY } from "../lib/tom/views/registry";
import { readView } from "../lib/tom/tools/view-read";

describe("view registry", () => {
  it("contains core expected view ids", () => {
    const ids = new Set(VIEW_REGISTRY.map((v) => v.id));
    expect(ids.has("operations.ptl")).toBe(true);
    expect(ids.has("logistics.roster_shifts")).toBe(true);
    expect(ids.has("logistics.inventory_stock")).toBe(true);
    expect(ids.has("planning.sessions")).toBe(true);
    expect(ids.has("collaboration.forum")).toBe(true);
    expect(ids.has("intelligence.audit_log")).toBe(true);
    expect(ids.has("settings.connectors")).toBe(true);
  });

  it("view.read returns not_implemented for unimplemented view", async () => {
    const result = await readView({ view_id: "settings.connectors" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("not_implemented");
  });
});
