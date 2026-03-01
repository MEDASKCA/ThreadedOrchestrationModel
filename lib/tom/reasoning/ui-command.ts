export type UiCommand =
  | { kind: "open_canvas" }
  | { kind: "close_canvas" }
  | { kind: "open_view"; section: "operations" | "planning" | "collaboration" }
  | { kind: "none" };

export function parseUiCommand(message: string): UiCommand {
  const t = String(message || "").toLowerCase().trim();
  if (!t) return { kind: "none" };

  if (
    t.includes("close canvas")
  ) {
    return { kind: "close_canvas" };
  }

  if (
    t.includes("open canvas") ||
    t.includes("show canvas") ||
    t.includes("open the canvas") ||
    t.includes("canvas to the right") ||
    t.includes("open panel") ||
    t.includes("show panel") ||
    /open\b.*\bcanvas/.test(t) ||
    /launch\b.*\bcanvas/.test(t) ||
    /pull up.*canvas/.test(t)
  ) {
    return { kind: "open_canvas" };
  }

  if (
    t.includes("open operations") ||
    t.includes("go to operations") ||
    t.includes("switch to operations") ||
    t.includes("back to operations") ||
    t === "operations"
  ) {
    return { kind: "open_view", section: "operations" };
  }

  if (
    t.includes("open planning") ||
    t.includes("go to planning") ||
    t.includes("switch to planning") ||
    t.includes("back to planning") ||
    t === "planning"
  ) {
    return { kind: "open_view", section: "planning" };
  }

  if (
    t.includes("open forum") ||
    t.includes("forum page") ||
    t.includes("go to forum") ||
    t.includes("show forum") ||
    t.includes("open collaboration") ||
    t.includes("go to collaboration") ||
    t.includes("show collaboration") ||
    t.includes("switch to collaboration") ||
    t.includes("back to collaboration") ||
    t === "forum" ||
    t === "collaboration"
  ) {
    return { kind: "open_view", section: "collaboration" };
  }

  return { kind: "none" };
}
