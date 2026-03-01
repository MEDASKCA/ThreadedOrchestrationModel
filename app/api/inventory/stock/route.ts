import { NextRequest, NextResponse } from "next/server";
import { read as readInventoryStock } from "@/lib/tom/views/readers/logistics.inventory_stock";

export async function GET(request: NextRequest) {
  const site = request.nextUrl.searchParams.get("site") ?? "Royal Infirmary";
  const result = await readInventoryStock({ filters: { site } });
  return NextResponse.json({
    data: result.data.rows,
    site,
    evidence: result.evidence,
    updated_at: new Date().toISOString(),
  });
}
