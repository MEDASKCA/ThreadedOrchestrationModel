import { getPathwaysFromConnectors } from "@/lib/pathways/data";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeValidationMetrics } from "@/lib/pathways/compute";
import { buildValidationTable } from "@/lib/pathways/tables";
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
  const metrics = computeValidationMetrics(data);
  const table = buildValidationTable(data);
  return {
    data: {
      metrics: {
        validation_overdue: metrics.validation_overdue,
        never_validated: metrics.never_validated,
        dna_without_rebook: metrics.dna_no_rebook,
        no_owner_assigned: metrics.no_owner,
        duplicate_nhs_numbers: metrics.duplicate_nhs,
        missing_mandatory_fields: metrics.missing_fields,
        no_recent_contact: metrics.no_contact,
        ghost_pathways: metrics.ghost_pathways,
      },
      table,
      context,
      updated_at: new Date().toISOString(),
    },
    evidence: [
      buildViewEvidence({
        view_id: "operations.validation_data_quality",
        filters: params.filters,
        records: data,
        label: "Validation and data quality issues",
        value: table.rows.length,
      }),
    ],
  };
}
