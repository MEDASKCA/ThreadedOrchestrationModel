import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import { Pathway } from "./schema";

export const getPathwaysFromConnectors = async (filters?: Partial<Pathway>) => {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  return connectorRegistry.epr.getPathways(filters);
};

export const getConnectorStatuses = async () => {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  return connectorRegistry.getAllStatuses();
};
