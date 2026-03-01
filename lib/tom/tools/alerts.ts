import { evaluateAlerts } from "@/lib/tom/alerts";
import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import type { ToolResult } from "./types";

export const getAlerts = async (): Promise<ToolResult<ReturnType<typeof evaluateAlerts>>> => {
  try {
    if (!connectorRegistry.isInitialized) {
      await initializeIntegrations();
    }
    const pathways = await connectorRegistry.epr.getPathways();
    const stock = await connectorRegistry.inventory.getStock("Royal Infirmary");
    const alerts = evaluateAlerts(pathways, stock);
    return { ok: true, data: alerts, source: "TOM Alerts" };
  } catch {
    return { ok: false, error: "Alerts unavailable", source: "TOM Alerts" };
  }
};
