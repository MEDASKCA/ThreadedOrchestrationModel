import { describe, expect, it } from "vitest";
import { enforceSingleQuestionText } from "../lib/tom/reasoning/emotion";

describe("emotion single-question rule", () => {
  it("ensures only one question remains in summary/title/bullets", () => {
    const result = enforceSingleQuestionText({
      title: "Reset?",
      summary: "Okay? Let us reset?",
      bullets: ["One?", "Two?"],
      question: "What do you want to look at next?",
    });
    const allText = `${result.title} ${result.summary} ${result.bullets.join(" ")}`;
    expect((allText.match(/\?/g) || []).length).toBe(1);
    expect(result.summary.endsWith("?")).toBe(true);
  });
});
