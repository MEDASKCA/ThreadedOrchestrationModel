import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("golden fixtures", () => {
  const goldenDir = path.join(process.cwd(), "rehydration", "golden");
  const files = ["pending_tasks.json", "ptl_breaches.json", "session_plan.json"];

  it("have expected structural fields", () => {
    for (const file of files) {
      const raw = fs.readFileSync(path.join(goldenDir, file), "utf8");
      const data = JSON.parse(raw) as {
        prompt?: string;
        expected?: { routing_path?: string | string[]; must_have_actions?: string[] };
      };
      expect(typeof data.prompt).toBe("string");
      expect(data.expected).toBeTruthy();
      expect(Array.isArray(data.expected?.must_have_actions)).toBe(true);
    }
  });
});
