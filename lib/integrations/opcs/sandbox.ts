import type { ConnectorStatus, OPCSConnector } from "../types";

const entries = [
  { code: "W37.1", description: "Primary total prosthetic replacement of hip joint using cement" },
  { code: "K40.1", description: "Coronary artery bypass graft" },
];

export const opcsSandbox: OPCSConnector = {
  id: "sandbox",
  name: "OPCS Sandbox",
  async getStatus(): Promise<ConnectorStatus> {
    return { connected: true, environment: "sandbox", lastSync: new Date().toISOString() };
  },
  async search(query: string) {
    const q = query.toLowerCase();
    return entries.filter((entry) => entry.code.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q));
  },
};
