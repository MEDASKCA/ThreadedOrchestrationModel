import { getPathwaysFromConnectors } from "@/lib/pathways/data";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeClockMetrics } from "@/lib/pathways/compute";
import { buildClockTable } from "@/lib/pathways/tables";
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
  const metrics = computeClockMetrics(data);
  const table = buildClockTable(data);
  return {
    data: {
      metrics: {
        clock_start_anomalies: metrics.clock_start_anomalies,
        suspended_clocks: metrics.suspended_clocks,
        stop_without_procedure: metrics.stop_without_proc,
        duplicate_clocks: metrics.duplicate_clocks,
        manual_overrides: metrics.manual_overrides,
      },
      table,
      context,
      updated_at: new Date().toISOString(),
    },
    evidence: [
      buildViewEvidence({
        view_id: "operations.clock_starts_stops",
        filters: params.filters,
        records: data,
        label: "Clock starts/stops anomalies",
        value: table.rows.length,
      }),
    ],
  };
}
