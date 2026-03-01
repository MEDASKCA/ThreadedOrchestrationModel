import type { ConnectorStatus, EPRConnector } from "../types";
import { isAzureConfigured } from "../azure";
import { queryAzureSql } from "../azure-sql";
import type { Pathway } from "@/lib/pathways/schema";

const baseUrl = process.env.EPIC_FHIR_BASE_URL || "";
const token = process.env.EPIC_FHIR_TOKEN || "";
const sqlQuery = process.env.AZURE_SQL_EPR_PATHWAYS_QUERY || "";

export const epicConnector: EPRConnector = {
  id: "epic",
  name: "Epic",
  async getStatus(): Promise<ConnectorStatus> {
    const connected = Boolean(isAzureConfigured() && (baseUrl || sqlQuery));
    return {
      connected,
      environment: connected ? "production" : "sandbox",
      lastSync: null,
      error: connected ? null : "Epic sandbox not configured",
    };
  },
  async getPathways() {
    if (isAzureConfigured() && sqlQuery) {
      const result = await queryAzureSql<Pathway>(sqlQuery);
      return result.rows;
    }
    return [];
  },
};
