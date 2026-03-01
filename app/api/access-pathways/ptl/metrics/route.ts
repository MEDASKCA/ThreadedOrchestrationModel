import { NextRequest, NextResponse } from "next/server";
import { PATHWAY_THRESHOLDS } from "@/lib/pathways/constants";
import { applyFilterContext, computePtlMetrics, PTL_METRIC_DEFINITIONS } from "@/lib/pathways/metrics";
import { parseFilterContext } from "@/lib/pathways/api";
import { getAccessSources } from "@/lib/pathways/sources";
import { getConnectorStatuses } from "@/lib/pathways/data";
import { getPathwaysFromConnectors } from "@/lib/pathways/data";

export async function GET(request: NextRequest) {
  const context = parseFilterContext(request);
  const sourcePathways = await getPathwaysFromConnectors();
  const data = applyFilterContext(sourcePathways, context);
  const counts = computePtlMetrics(data);
  const statuses = await getConnectorStatuses();

  return NextResponse.json({
    counts,
    definitions: PTL_METRIC_DEFINITIONS,
    thresholds: PATHWAY_THRESHOLDS,
    context,
    sources: getAccessSources("ptl", statuses),
    updated_at: new Date().toISOString(),
  });
}
