import type { ConnectorStatus, InventoryConnector } from "../types";

const stock = [
  { id: "stk-001", name: "Surgical gloves (Size 7)", category: "Consumables", site: "Royal Infirmary", quantity: 15, minLevel: 20, unit: "boxes" },
  { id: "stk-002", name: "Sutures 2-0 Vicryl", category: "Consumables", site: "Royal Infirmary", quantity: 8, minLevel: 10, unit: "packs" },
  { id: "stk-003", name: "Diathermy pencils", category: "Consumables", site: "City Hospital", quantity: 30, minLevel: 15, unit: "units" },
];

export const inventorySandbox: InventoryConnector = {
  id: "sandbox",
  name: "Inventory Sandbox",
  async getStatus(): Promise<ConnectorStatus> {
    return { connected: true, environment: "sandbox", lastSync: new Date().toISOString() };
  },
  async getStock(site: string) {
    return stock.filter((item) => item.site === site);
  },
};
