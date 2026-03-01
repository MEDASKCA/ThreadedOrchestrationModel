import { NextResponse } from "next/server";
import { TOM_FEATURE_FLAGS } from "@/lib/tom/flags";
import { runBaselineRefresh } from "@/lib/tom/run";

export async function POST() {
  if (!TOM_FEATURE_FLAGS.anomaliesV1) {
    return NextResponse.json({ enabled: false }, { status: 403 });
  }
  const result = await runBaselineRefresh();
  return NextResponse.json({
    enabled: true,
    baselines: result.baselines,
    updated_at: new Date().toISOString(),
  });
}
