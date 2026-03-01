import { describe, expect, it } from "vitest";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { createTraceBase } from "../lib/tom/reasoning/trace";
import { getTrace, saveTrace } from "../lib/tom/reasoning/trace-store";

describe("trace-store", () => {
  it("saves a trace and reads it back", async () => {
    const traceDir = path.join(
      process.cwd(),
      "rehydration",
      "traces-test",
      `trace-store-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    );
    process.env.TOM_TRACE_STORE_DIR = traceDir;

    await mkdir(traceDir, { recursive: true });

    try {
      const trace = createTraceBase({
        user_message: "PTL summary",
        intent: "operational_query",
        intent_confidence: 0.8,
      });
      trace.goal = "Test persistence";
      trace.outcome = { status: "ok" };

      await saveTrace(trace);

      const expectedPath = path.join(traceDir, `${encodeURIComponent(trace.trace_id)}.json`);
      const fileStats = await stat(expectedPath);
      expect(fileStats.isFile()).toBe(true);

      const loaded = await getTrace(trace.trace_id);
      expect(loaded).toEqual(trace);
    } finally {
      delete process.env.TOM_TRACE_STORE_DIR;
      await rm(traceDir, { recursive: true, force: true });
    }
  });
});
