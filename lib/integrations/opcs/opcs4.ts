import type { ConnectorStatus, OPCSConnector, OPCSEntry } from "../types";
import { isAzureConfigured } from "../azure";
import { readFileSync, existsSync } from "node:fs";

const dataPath = process.env.OPCS_JSON_PATH || "";

const loadEntries = (): OPCSEntry[] => {
  if (!dataPath || !existsSync(dataPath)) return [];
  try {
    const raw = readFileSync(dataPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as OPCSEntry[];
  } catch {
    return [];
  }
  return [];
};

export const opcsConnector: OPCSConnector = {
  id: "opcs4",
  name: "OPCS-4",
  async getStatus(): Promise<ConnectorStatus> {
    const connected = Boolean(isAzureConfigured() && dataPath);
    return {
      connected,
      environment: connected ? "production" : "sandbox",
      lastSync: null,
      error: connected ? null : "OPCS dataset not configured",
    };
  },
  async search(query: string) {
    const entries = loadEntries();
    const q = query.toLowerCase();
    return entries.filter((entry) =>
      entry.code.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q)
    );
  },
};
