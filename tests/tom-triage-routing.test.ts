import { describe, expect, it } from "vitest";
import {
  detectTriageQueryKind,
  isTriageQuery,
  queueCounts,
} from "../lib/tom/pages/triage-analyser";
import { normalizeTriageStatusPage } from "../lib/tom/pages/triage";

describe("triage routing heuristics", () => {
  it("overdue triage query maps to triage-status analyser path", () => {
    expect(isTriageQuery("any overdue triage?")).toBe(true);
    expect(detectTriageQueryKind("any overdue triage?")).toBe("overdue");
  });

  it("returns overdue triage tile when present", () => {
    const page = normalizeTriageStatusPage({
      metrics: { overdue_triage: 5, awaiting_consultant_review: 8 },
      rows: [],
    });
    const counts = queueCounts(page);
    expect(counts.overdue_triage).toBe(5);
  });

  it("does not classify unrelated text as triage query", () => {
    expect(isTriageQuery("hello team")).toBe(false);
  });
});
