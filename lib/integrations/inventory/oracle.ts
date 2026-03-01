import type { ConnectorStatus, InventoryConnector } from "../types";
import { isAzureConfigured } from "../azure";
import { queryAzureSql } from "../azure-sql";
import type { StockItem } from "../types";

const baseUrl = process.env.ORACLE_INVENTORY_API_BASE_URL || "";
const token = process.env.ORACLE_INVENTORY_API_TOKEN || "";
const sqlQuery = process.env.AZURE_SQL_INVENTORY_STOCK_QUERY || "";

export const oracleConnector: InventoryConnector = {
  id: "oracle",
  name: "Oracle Inventory",
  async getStatus(): Promise<ConnectorStatus> {
    const connected = Boolean(isAzureConfigured() && (baseUrl || sqlQuery));
    return {
      connected,
      environment: connected ? "production" : "sandbox",
      lastSync: null,
      error: connected ? null : "Oracle inventory not configured",
    };
  },
  async getStock() {
    if (isAzureConfigured() && sqlQuery) {
      const result = await queryAzureSql<StockItem>(sqlQuery);
      return result.rows;
    }
    return [];
  },
};
