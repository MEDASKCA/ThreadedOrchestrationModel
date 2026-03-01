import { describe, expect, it } from "vitest";
import { isWaitingListExtremesQuery } from "../lib/tom/reasoning/waiting-list";

describe("waiting list extremes query detector", () => {
  it("matches longest waiter phrases", () => {
    expect(isWaitingListExtremesQuery("who is our longest waiter?")).toBe(true);
    expect(isWaitingListExtremesQuery("highest wait right now")).toBe(true);
    expect(isWaitingListExtremesQuery("top waiters")).toBe(true);
  });

  it("does not match unrelated prompts", () => {
    expect(isWaitingListExtremesQuery("help me plan my week")).toBe(false);
  });
});
