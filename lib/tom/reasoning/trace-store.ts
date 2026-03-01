import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReasoningTrace } from "./trace";

const getTraceDirectory = () => {
  const configured = process.env.TOM_TRACE_STORE_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(process.cwd(), "rehydration", "traces");
};

const getTraceFilePath = (trace_id: string) => {
  const safeName = encodeURIComponent(trace_id);
  return path.join(getTraceDirectory(), `${safeName}.json`);
};

export async function saveTrace(trace: ReasoningTrace): Promise<void> {
  const dir = getTraceDirectory();
  await mkdir(dir, { recursive: true });
  await writeFile(getTraceFilePath(trace.trace_id), `${JSON.stringify(trace, null, 2)}\n`, "utf8");
}

export async function getTrace(trace_id: string): Promise<ReasoningTrace | null> {
  try {
    const raw = await readFile(getTraceFilePath(trace_id), "utf8");
    return JSON.parse(raw) as ReasoningTrace;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
