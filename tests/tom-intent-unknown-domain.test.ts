import { describe, expect, it } from "vitest";
import { classifyIntent, detectUnknownDomainWord } from "../lib/tom/reasoning/intent";

describe("unknown domain intent", () => {
  it("routes unsupported domain-like prompts to unknown_domain_query", () => {
    expect(classifyIntent("what is trending in forums?")).toBe("unknown_domain_query");
    expect(detectUnknownDomainWord("what is trending in forums?")).toBe("forums");
  });

  it("does not hijack weather prompts", () => {
    expect(classifyIntent("do you know the weather tomorrow?")).toBe("conversational_misc");
  });

  it("does not override emotional prompts", () => {
    expect(classifyIntent("this is fucking annoying")).toBe("emotion_or_short_utterance");
  });
});
