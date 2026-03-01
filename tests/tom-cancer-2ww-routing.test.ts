import { describe, expect, it } from "vitest";
import {
  detectCancer2WWQueryKind,
  isCancer2WWQuery,
  safetyEscalations,
} from "../lib/tom/pages/cancer-2ww-analyser";
import { normalizeCancer2WWPage } from "../lib/tom/pages/cancer-2ww";
import { isExplainRequest } from "../lib/tom/reasoning/explain-trigger";

describe("cancer 2ww routing heuristics", () => {
  it("detects 2ww breach queries for cancer pages-first path", () => {
    expect(isCancer2WWQuery("any 2ww breaches?")).toBe(true);
    expect(detectCancer2WWQueryKind("any 2ww breaches?")).toBe("breaches");
  });

  it("returns safety escalation tile value", () => {
    const page = normalizeCancer2WWPage({
      metrics: { safety_escalations: 4 },
      table: { rows: [] },
    });
    expect(safetyEscalations(page)).toBe(4);
  });

  it("explain 2ww is an explain trigger for expanded narrative mode", () => {
    expect(isExplainRequest("explain 2ww")).toBe(true);
    expect(isExplainRequest("refresh 2ww")).toBe(false);
  });
});
