import { getPathwaysFromConnectors } from "@/lib/pathways/data";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeWaitingListMetrics } from "@/lib/pathways/compute";
import { buildWaitingListTable } from "@/lib/pathways/tables";
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
  const metrics = computeWaitingListMetrics(data);
  const table = buildWaitingListTable(data);
  return {
    data: { metrics, table, context, updated_at: new Date().toISOString() },
    evidence: [buildViewEvidence({ view_id: "operations.access_pathways_waiting_list", filters: params.filters, records: data, label: "Waiting list pathways", value: data.length })],
  };
}
