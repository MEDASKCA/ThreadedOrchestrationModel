import { NextRequest, NextResponse } from "next/server";
import { TOM_FEATURE_FLAGS } from "@/lib/tom/flags";
import { prisma } from "@/lib/tom/db";

export async function GET(request: NextRequest) {
  if (!TOM_FEATURE_FLAGS.anomaliesV1) {
    return NextResponse.json({ enabled: false }, { status: 403 });
  }
  const params = request.nextUrl.searchParams;
  const scope = params.get("scope") ?? undefined;
  const scopeId = params.get("scope_id") ?? undefined;
  const severity = params.get("severity") ?? undefined;
  const status = params.get("status") ?? undefined;

  const anomalies = await prisma.anomaly.findMany({
    where: {
      ...(scope ? { scope } : {}),
      ...(scopeId ? { scopeId } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { detectionDate: "desc" },
  });

  return NextResponse.json({
    enabled: true,
    anomalies,
    updated_at: new Date().toISOString(),
  });
}
