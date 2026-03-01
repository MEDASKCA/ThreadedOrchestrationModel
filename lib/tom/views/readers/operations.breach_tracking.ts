import { getPathwaysFromConnectors } from "@/lib/pathways/data";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeBreachMetrics } from "@/lib/pathways/compute";
import { buildBreachTable } from "@/lib/pathways/tables";
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
  const metrics = computeBreachMetrics(data);
  const table = buildBreachTable(data);
  return {
    data: {
      metrics: {
        breaches_by_specialty: metrics.breaches_by_specialty,
        breaches_by_cause: metrics.breaches_by_cause,
        repeat_breach_cases: metrics.repeat_breaches,
        weekly_trend: metrics.trend_weekly,
      },
      table,
      context,
      updated_at: new Date().toISOString(),
    },
    evidence: [
      buildViewEvidence({
        view_id: "operations.breach_tracking",
        filters: params.filters,
        records: data,
        label: "Breach tracking cases",
        value: table.rows.length,
      }),
    ],
  };
}
