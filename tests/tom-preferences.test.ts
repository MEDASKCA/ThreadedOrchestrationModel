import { describe, expect, it } from "vitest";
import { extractPreferences } from "../lib/tom/reasoning/preferences";

describe("preferences extractor", () => {
  it("extracts short + bullets", () => {
    const result = extractPreferences("keep it short, bullet points");
    expect(result).toEqual({ verbosity: "short", format: "bullets" });
  });

  it("extracts formal tone", () => {
    const result = extractPreferences("make it formal");
    expect(result).toEqual({ tone: "formal" });
  });
});
