import { NextRequest, NextResponse } from "next/server";
import { parseFilterContext } from "@/lib/pathways/api";
import { REFERRAL_METRICS } from "@/lib/pathways/stubs";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeReferralMetrics } from "@/lib/pathways/compute";
import { buildReferralTable } from "@/lib/pathways/tables";
import { getAccessSources } from "@/lib/pathways/sources";
import { buildFilterOptions } from "@/lib/pathways/options";
import { getConnectorStatuses, getPathwaysFromConnectors } from "@/lib/pathways/data";

export async function GET(request: NextRequest) {
  const context = parseFilterContext(request);
  const sourcePathways = await getPathwaysFromConnectors();
  const data = applyFilterContext(sourcePathways, context);
  const computed = computeReferralMetrics(data);
  const metrics = REFERRAL_METRICS.map((definition) => ({
    key: definition.key,
    count: computed[definition.key as keyof typeof computed] ?? 0,
  }));
  const table = buildReferralTable(data);
  const filter_options = buildFilterOptions(sourcePathways);
  const statuses = await getConnectorStatuses();

  return NextResponse.json({
    metrics,
    definitions: REFERRAL_METRICS,
    table,
    filter_options,
    sources: getAccessSources("referral-management", statuses),
    context,
    updated_at: new Date().toISOString(),
  });
}
