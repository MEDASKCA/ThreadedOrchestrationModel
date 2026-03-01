import { describe, expect, it } from "vitest";
import { sanitizeRichResponse, sanitizeTextBlock } from "../lib/tom/narrative/sanitize";

describe("sanitizeRichResponse", () => {
  it("sanitizes duplicate lines in a text block", () => {
    expect(sanitizeTextBlock("Alright, Alright\nSame\nsame")).toBe("Alright\nSame");
  });

  it("dedupes repeated lines and collapses repeated lead words", () => {
    const result = sanitizeRichResponse({
      title: "Alright, Alright",
      summary: "Same line\nsame line",
      bullets: ["Echo", "echo"],
    });
    expect(result.title).toBe("Alright");
    expect(result.summary).toBe("Same line");
    expect(result.bullets).toEqual(["Echo", "echo"]);
  });

  it("keeps at most one question mark across title/summary/bullets", () => {
    const result = sanitizeRichResponse({
      title: "Title?",
      summary: "Summary?",
      bullets: ["One?", "Two?"],
    });
    const count = `${result.title} ${result.summary} ${result.bullets.join(" ")}`.match(/\?/g)?.length ?? 0;
    expect(count).toBe(1);
  });
});
