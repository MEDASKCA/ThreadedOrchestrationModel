import { NextResponse } from "next/server";
import { TOM_FEATURE_FLAGS } from "@/lib/tom/flags";
import { runMetricsCollection } from "@/lib/tom/run";

export async function POST() {
  if (!TOM_FEATURE_FLAGS.anomaliesV1) {
    return NextResponse.json({ enabled: false }, { status: 403 });
  }
  const result = await runMetricsCollection();
  return NextResponse.json({
    enabled: true,
    metrics: result.metrics,
    pathways_count: result.pathwaysCount,
    updated_at: new Date().toISOString(),
  });
}
