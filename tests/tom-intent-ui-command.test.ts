import { describe, expect, it } from "vitest";
import { classifyIntent } from "../lib/tom/reasoning/intent";
import { parseUiCommand } from "../lib/tom/reasoning/ui-command";

describe("ui_command intent", () => {
  it("classifies open canvas prompt as ui_command", () => {
    expect(classifyIntent("open the canvas to the right")).toBe("ui_command");
  });

  it("parses close canvas command deterministically", () => {
    expect(parseUiCommand("close canvas")).toEqual({ kind: "close_canvas" });
  });
});
