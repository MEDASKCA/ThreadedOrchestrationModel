import type { ConnectorStatus, RosterConnector } from "../types";
import { isAzureConfigured } from "../azure";
import { queryAzureSql } from "../azure-sql";
import type { RosterShift } from "../types";

const baseUrl = process.env.OPTIMA_API_BASE_URL || "";
const token = process.env.OPTIMA_API_TOKEN || "";
const sqlQuery = process.env.AZURE_SQL_ROSTER_SHIFTS_QUERY || "";

export const optimaConnector: RosterConnector = {
  id: "optima",
  name: "Optima",
  async getStatus(): Promise<ConnectorStatus> {
    const connected = Boolean(isAzureConfigured() && (baseUrl || sqlQuery));
    return {
      connected,
      environment: connected ? "production" : "sandbox",
      lastSync: null,
      error: connected ? null : "Optima sandbox not configured",
    };
  },
  async getShifts() {
    if (isAzureConfigured() && sqlQuery) {
      const result = await queryAzureSql<RosterShift>(sqlQuery);
      return result.rows;
    }
    return [];
  },
};
