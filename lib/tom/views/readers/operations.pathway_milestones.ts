import { getPathwaysFromConnectors } from "@/lib/pathways/data";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeMilestoneMetrics } from "@/lib/pathways/compute";
import { buildMilestoneTable } from "@/lib/pathways/tables";
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
  const metrics = computeMilestoneMetrics(data);
  const table = buildMilestoneTable(data);
  return {
    data: {
      metrics: {
        stage_distribution: metrics.stage_distribution,
        average_days_between_stages: metrics.avg_stage_gap,
        bottleneck_heatmap: metrics.bottlenecks,
      },
      table,
      context,
      updated_at: new Date().toISOString(),
    },
    evidence: [
      buildViewEvidence({
        view_id: "operations.pathway_milestones",
        filters: params.filters,
        records: data,
        label: "Pathway milestones",
        value: table.rows.length,
      }),
    ],
  };
}
