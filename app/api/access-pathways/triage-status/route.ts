import { NextRequest, NextResponse } from "next/server";
import { parseFilterContext } from "@/lib/pathways/api";
import { TRIAGE_METRICS } from "@/lib/pathways/stubs";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeTriageMetrics } from "@/lib/pathways/compute";
import { buildTriageTable } from "@/lib/pathways/tables";
import { getAccessSources } from "@/lib/pathways/sources";
import { buildFilterOptions } from "@/lib/pathways/options";
import { getConnectorStatuses, getPathwaysFromConnectors } from "@/lib/pathways/data";

export async function GET(request: NextRequest) {
  const context = parseFilterContext(request);
  const sourcePathways = await getPathwaysFromConnectors();
  const data = applyFilterContext(sourcePathways, context);
  const computed = computeTriageMetrics(data);
  const metrics = TRIAGE_METRICS.map((definition) => ({
    key: definition.key,
    count: computed[definition.key as keyof typeof computed] ?? 0,
  }));
  const table = buildTriageTable(data);
  const filter_options = buildFilterOptions(sourcePathways);
  const statuses = await getConnectorStatuses();

  return NextResponse.json({
    metrics,
    definitions: TRIAGE_METRICS,
    table,
    filter_options,
    sources: getAccessSources("triage-status", statuses),
    context,
    updated_at: new Date().toISOString(),
  });
}
