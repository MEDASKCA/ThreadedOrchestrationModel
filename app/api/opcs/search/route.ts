import { NextRequest, NextResponse } from "next/server";
import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";

export async function GET(request: NextRequest) {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const results = await connectorRegistry.opcs.search(query);
  return NextResponse.json({
    data: results,
    query,
    updated_at: new Date().toISOString(),
  });
}
