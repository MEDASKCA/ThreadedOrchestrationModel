import { NextRequest, NextResponse } from "next/server";
import { parseFilterContext } from "@/lib/pathways/api";
import { CLOCK_METRICS } from "@/lib/pathways/stubs";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeClockMetrics } from "@/lib/pathways/compute";
import { buildClockTable } from "@/lib/pathways/tables";
import { getAccessSources } from "@/lib/pathways/sources";
import { buildFilterOptions } from "@/lib/pathways/options";
import { getConnectorStatuses, getPathwaysFromConnectors } from "@/lib/pathways/data";

export async function GET(request: NextRequest) {
  const context = parseFilterContext(request);
  const sourcePathways = await getPathwaysFromConnectors();
  const data = applyFilterContext(sourcePathways, context);
  const computed = computeClockMetrics(data);
  const metrics = CLOCK_METRICS.map((definition) => ({
    key: definition.key,
    count: computed[definition.key as keyof typeof computed] ?? 0,
  }));
  const table = buildClockTable(data);
  const filter_options = buildFilterOptions(sourcePathways);
  const statuses = await getConnectorStatuses();

  return NextResponse.json({
    metrics,
    definitions: CLOCK_METRICS,
    table,
    filter_options,
    sources: getAccessSources("clock-starts-stops", statuses),
    context,
    updated_at: new Date().toISOString(),
  });
}
