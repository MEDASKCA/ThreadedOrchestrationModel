import { NextRequest, NextResponse } from "next/server";
import { parseFilterContext } from "@/lib/pathways/api";
import { WAITING_LIST_METRICS } from "@/lib/pathways/stubs";
import { buildFilterOptions } from "@/lib/pathways/options";
import { getAccessSources } from "@/lib/pathways/sources";
import { getConnectorStatuses, getPathwaysFromConnectors } from "@/lib/pathways/data";
import { read as readWaitingListView } from "@/lib/tom/views/readers/operations.access_pathways_waiting_list";

export async function GET(request: NextRequest) {
  const context = parseFilterContext(request);
  const sourcePathways = await getPathwaysFromConnectors();
  const result = await readWaitingListView({ filters: context as Record<string, any> });
  const metricsObj = result.data.metrics as Record<string, number>;
  const metrics = WAITING_LIST_METRICS.map((definition) => ({
    key: definition.key,
    count: metricsObj[definition.key] ?? 0,
  }));
  const filter_options = buildFilterOptions(sourcePathways);
  const statuses = await getConnectorStatuses();

  return NextResponse.json({
    metrics,
    definitions: WAITING_LIST_METRICS,
    table: result.data.table,
    filter_options,
    sources: getAccessSources("waiting-list", statuses),
    evidence: result.evidence,
    context,
    updated_at: new Date().toISOString(),
  });
}
