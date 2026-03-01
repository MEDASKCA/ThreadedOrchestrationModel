import type { ToolResult } from "./types";

export const getReferralSummary = async (): Promise<ToolResult<{ connected: boolean; summary: string }>> => {
  return { ok: false, error: "PAS not connected", source: "PAS" };
};
