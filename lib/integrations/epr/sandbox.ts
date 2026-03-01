import { pathwayFixtures } from "@/lib/pathways/fixtures";
import { Pathway } from "@/lib/pathways/schema";
import type { ConnectorStatus, EPRConnector } from "../types";

const applyPartialFilter = (pathways: Pathway[], filters?: Partial<Pathway>) => {
  if (!filters) return pathways;
  return pathways.filter((p) => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === "") return true;
      return String((p as any)[key]) === String(value);
    });
  });
};

export const eprSandbox: EPRConnector = {
  id: "sandbox",
  name: "EPR Sandbox",
  async getStatus(): Promise<ConnectorStatus> {
    return {
      connected: true,
      environment: "sandbox",
      lastSync: new Date().toISOString(),
    };
  },
  async getPathways(filters?: Partial<Pathway>) {
    return applyPartialFilter(pathwayFixtures, filters);
  },
};
