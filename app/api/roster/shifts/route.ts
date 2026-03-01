import { NextRequest, NextResponse } from "next/server";
import { read as readRosterShifts } from "@/lib/tom/views/readers/logistics.roster_shifts";

export async function GET(request: NextRequest) {
  const site = request.nextUrl.searchParams.get("site") ?? "Royal Infirmary";
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const result = await readRosterShifts({ filters: { site, date } });
  return NextResponse.json({
    data: result.data.rows,
    site,
    date,
    evidence: result.evidence,
    updated_at: new Date().toISOString(),
  });
}
