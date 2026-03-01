import type { ConnectorStatus, RosterConnector } from "../types";

const shifts = [
  { id: "shift-1", staffName: "A. Patel", role: "Nurse", site: "Royal Infirmary", date: "2026-02-21", startTime: "08:00", endTime: "16:00" },
  { id: "shift-2", staffName: "R. Singh", role: "ODP", site: "City Hospital", date: "2026-02-21", startTime: "09:00", endTime: "17:00" },
];

export const rosterSandbox: RosterConnector = {
  id: "sandbox",
  name: "Roster Sandbox",
  async getStatus(): Promise<ConnectorStatus> {
    return { connected: true, environment: "sandbox", lastSync: new Date().toISOString() };
  },
  async getShifts(site: string, date: string) {
    return shifts.filter((s) => s.site === site && s.date === date);
  },
};
