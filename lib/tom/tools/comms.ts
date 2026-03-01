import type { ToolResult } from "./types";

export const getCommsSummary = async (): Promise<ToolResult<{ connected: boolean; summary: string }>> => {
  return { ok: false, error: "COMMS not connected", source: "COMMS" };
};
