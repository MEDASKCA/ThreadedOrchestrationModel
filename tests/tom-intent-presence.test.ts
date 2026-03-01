import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";

describe("presence_ping intent", () => {
  it("classifies 'are you there?' as presence_ping", () => {
    expect(classifyIntent("are you there?")).toBe("presence_ping");
  });

  it("classifies 'ping' as presence_ping", () => {
    expect(classifyIntent("ping")).toBe("presence_ping");
  });
});
