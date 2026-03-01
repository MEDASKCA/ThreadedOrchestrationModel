import { getPathwaysFromConnectors } from "@/lib/pathways/data";
import { applyFilterContext, computePtlMetrics } from "@/lib/pathways/metrics";
import { buildViewEvidence } from "./evidence";

const toFilterContext = (filters?: Record<string, any>) => ({
  specialty: filters?.specialty,
  consultant: filters?.consultant,
  site: filters?.site,
  date_from: filters?.date_from,
  date_to: filters?.date_to,
  search: filters?.search,
  rtt_status: filters?.rtt_status,
  stage: filters?.stage,
  priority: filters?.priority,
  owner_id: filters?.owner_id,
});

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const context = toFilterContext(params.filters);
  const sourcePathways = await getPathwaysFromConnectors();
  const data = applyFilterContext(sourcePathways, context);
  const counts = computePtlMetrics(data);
  const tableRows = data.slice(0, 25).map((item: any) => ({
    patient_name: item.patient_name ?? item.patient ?? item.name ?? null,
    specialty: item.specialty ?? null,
    waiting_days: typeof item.waiting_days === "number" ? item.waiting_days : (typeof item.waitDays === "number" ? item.waitDays : null),
    rtt_status: item.rtt_status ?? item.status ?? null,
    pathway: item.pathway ?? item.pathway_name ?? null,
  }));
  const table = {
    columns: [
      { key: "patient_name", label: "Patient" },
      { key: "specialty", label: "Specialty" },
      { key: "waiting_days", label: "Waiting days", align: "right" as const },
      { key: "rtt_status", label: "RTT status" },
      { key: "pathway", label: "Pathway" },
    ],
    rows: tableRows,
    row_badges: [
      {
        columnKey: "rtt_status",
        map: {
          "On Track": { variant: "good" as const },
          Breaching: { variant: "bad" as const },
          Escalated: { variant: "warn" as const },
        },
      },
    ],
  };
  return {
    data: { data, counts, context, updated_at: new Date().toISOString(), table },
    evidence: [buildViewEvidence({ view_id: "operations.ptl", filters: params.filters, records: data, label: "PTL pathways", value: data.length })],
  };
}
