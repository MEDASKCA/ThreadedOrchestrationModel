import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import type { ToolResult } from "./types";

export const getStaffingSummary = async (): Promise<ToolResult<{ connected: boolean; summary: string }>> => {
  try {
    if (!connectorRegistry.isInitialized) {
      await initializeIntegrations();
    }
    const status = await connectorRegistry.roster.getStatus();
    if (!status.connected) {
      return { ok: false, error: "Roster not connected", source: "Roster" };
    }
    return { ok: true, data: { connected: true, summary: "Roster connected" }, source: "Roster" };
  } catch {
    return { ok: false, error: "Roster unavailable", source: "Roster" };
  }
};
