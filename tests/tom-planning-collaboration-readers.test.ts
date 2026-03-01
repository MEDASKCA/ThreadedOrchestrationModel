import { describe, expect, it } from "vitest";
import { read as readPlanningSessions } from "../lib/tom/views/readers/planning.sessions";
import { read as readCollaborationDeliverables } from "../lib/tom/views/readers/collaboration.deliverables";

describe("planning/collaboration readers", () => {
  it("planning sessions reader returns standardized evidence source", async () => {
    const result = await readPlanningSessions({ filters: {} });
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence[0]?.source?.startsWith("view.read:")).toBe(true);
    expect(result.evidence[0]?.inputs?.view_id).toBe("planning.sessions");
  });

  it("collaboration deliverables reader returns standardized evidence source", async () => {
    const result = await readCollaborationDeliverables({ filters: {} });
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence[0]?.source?.startsWith("view.read:")).toBe(true);
    expect(result.evidence[0]?.inputs?.view_id).toBe("collaboration.deliverables");
  });
});
