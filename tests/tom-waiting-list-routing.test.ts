import { describe, expect, it } from "vitest";
import {
  detectWaitingListQueryKind,
  isWaitingListMacroQuestion,
} from "../lib/tom/pages/waiting-list-analyser";

describe("waiting list routing heuristics", () => {
  it("routes 'how many are waiting' to waiting-list analyser path", () => {
    expect(isWaitingListMacroQuestion("how many are waiting?")).toBe(true);
    expect(detectWaitingListQueryKind("how many are waiting?")).toBe("total_waiting");
  });

  it("identifies specialty max-wait and capacity-gap queries", () => {
    expect(detectWaitingListQueryKind("which specialty has the longest wait?")).toBe("max_avg_wait");
    expect(detectWaitingListQueryKind("where is capacity gap biggest?")).toBe("capacity_gap");
  });

  it("does not fall into unknown for explicit waiting list questions", () => {
    expect(detectWaitingListQueryKind("how many on the waiting list")).not.toBe("unknown");
  });
});
