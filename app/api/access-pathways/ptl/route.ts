import { NextRequest, NextResponse } from "next/server";
import { applyFilterContext, computePtlMetrics, filterByMetric } from "@/lib/pathways/metrics";
import { parseFilterContext } from "@/lib/pathways/api";
import { getAccessSources } from "@/lib/pathways/sources";
import { buildFilterOptions } from "@/lib/pathways/options";
import { getConnectorStatuses, getPathwaysFromConnectors } from "@/lib/pathways/data";

export async function GET(request: NextRequest) {
  const context = parseFilterContext(request);
  const metric = request.nextUrl.searchParams.get("metric");

  const sourcePathways = await getPathwaysFromConnectors();
  let data = applyFilterContext(sourcePathways, context);
  if (metric) {
    data = filterByMetric(data, metric as Parameters<typeof filterByMetric>[1]);
  }

  const counts = computePtlMetrics(data);
  const filter_options = buildFilterOptions(sourcePathways);
  const statuses = await getConnectorStatuses();

  return NextResponse.json({
    data,
    counts,
    context,
    filter_options,
    sources: getAccessSources("ptl", statuses),
    updated_at: new Date().toISOString(),
  });
}
