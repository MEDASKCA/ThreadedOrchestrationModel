import { describe, expect, it } from "vitest";
import { dedupeLines } from "../lib/tom/narrative/dedupe";

describe("dedupeLines", () => {
  it("removes duplicate lines case-insensitively and keeps order", () => {
    const input = "Alright\nalright\nNext line\nnext line\nFinal";
    expect(dedupeLines(input)).toBe("Alright\nNext line\nFinal");
  });

  it("collapses duplicated leading words", () => {
    expect(dedupeLines("Alright, Alright let's reset")).toBe("Alright let's reset");
  });
});
