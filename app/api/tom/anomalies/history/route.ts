import { NextRequest, NextResponse } from "next/server";
import { TOM_FEATURE_FLAGS } from "@/lib/tom/flags";
import { prisma } from "@/lib/tom/db";

export async function GET(request: NextRequest) {
  if (!TOM_FEATURE_FLAGS.anomaliesV1) {
    return NextResponse.json({ enabled: false }, { status: 403 });
  }
  const params = request.nextUrl.searchParams;
  const anomalyId = params.get("anomaly_id");
  if (!anomalyId) {
    return NextResponse.json({ error: "anomaly_id is required" }, { status: 400 });
  }

  const history = await prisma.anomalyHistory.findMany({
    where: { anomalyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    enabled: true,
    history,
    updated_at: new Date().toISOString(),
  });
}
