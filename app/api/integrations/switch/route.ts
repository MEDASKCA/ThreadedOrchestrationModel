import { NextRequest, NextResponse } from "next/server";
import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";

export async function POST(request: NextRequest) {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const body = await request.json();
  const { category, id } = body || {};
  if (!category || !id) {
    return NextResponse.json({ error: "Missing category or id" }, { status: 400 });
  }
  await connectorRegistry.switchConnector(category, id);
  return NextResponse.json({
    config: connectorRegistry.getConfig(),
    updated_at: new Date().toISOString(),
  });
}
