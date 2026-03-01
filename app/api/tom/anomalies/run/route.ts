import { NextResponse } from "next/server";
import { TOM_FEATURE_FLAGS } from "@/lib/tom/flags";
import { runAnomalyDetection } from "@/lib/tom/run";

export async function POST() {
  if (!TOM_FEATURE_FLAGS.anomaliesV1) {
    return NextResponse.json({ enabled: false }, { status: 403 });
  }
  const result = await runAnomalyDetection();
  return NextResponse.json({
    enabled: true,
    anomalies: result.anomalies,
    dispatches: result.dispatches,
    updated_at: new Date().toISOString(),
  });
}
