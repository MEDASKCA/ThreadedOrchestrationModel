import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import { buildViewEvidence } from "./evidence";

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const site = String(params.filters?.site || "Royal Infirmary");
  const date = String(params.filters?.date || new Date().toISOString().split("T")[0]);
  const rows = await connectorRegistry.roster.getShifts(site, date);
  const tableRows = (Array.isArray(rows) ? rows : []).slice(0, 25).map((row: any) => ({
    shift_id: row.shift_id ?? row.id ?? null,
    ward: row.ward ?? row.location ?? null,
    role: row.role ?? row.grade ?? null,
    assignee: row.assignee ?? row.staff_name ?? row.staff ?? null,
    status: row.status ?? (row.assignee ? "On Duty" : "Unassigned"),
  }));
  const table = {
    columns: [
      { key: "shift_id", label: "Shift" },
      { key: "ward", label: "Ward" },
      { key: "role", label: "Role" },
      { key: "assignee", label: "Assignee" },
      { key: "status", label: "Status" },
    ],
    rows: tableRows,
    row_badges: [
      {
        columnKey: "status",
        map: {
          "On Duty": { variant: "good" as const },
          Unassigned: { variant: "warn" as const },
          Escalated: { variant: "bad" as const },
          Active: { variant: "info" as const },
        },
      },
    ],
  };
  return {
    data: { site, date, rows, table },
    evidence: [buildViewEvidence({ view_id: "logistics.roster_shifts", filters: params.filters, records: Array.isArray(rows) ? rows : [], label: "Roster shifts", value: Array.isArray(rows) ? rows.length : 0 })],
  };
}
