import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import { buildViewEvidence } from "./evidence";

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const site = String(params.filters?.site || "Royal Infirmary");
  const rows = await connectorRegistry.inventory.getStock(site);
  return {
    data: { site, rows },
    evidence: [buildViewEvidence({ view_id: "logistics.inventory_stock", filters: params.filters, records: Array.isArray(rows) ? rows : [], label: "Inventory stock", value: Array.isArray(rows) ? rows.length : 0 })],
  };
}
