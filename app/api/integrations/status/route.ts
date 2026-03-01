import { NextResponse } from "next/server";
import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";

export async function GET() {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const statuses = await connectorRegistry.getAllStatuses();
  return NextResponse.json({
    statuses,
    config: connectorRegistry.getConfig(),
    updated_at: new Date().toISOString(),
  });
}
