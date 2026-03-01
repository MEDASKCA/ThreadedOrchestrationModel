import { NextRequest, NextResponse } from "next/server";
import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";

export async function GET(request: NextRequest) {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const params = request.nextUrl.searchParams;
  const pathwayId = params.get("pathway_id");
  const patientId = params.get("patient_id");
  const specialty = params.get("specialty");
  const consultant = params.get("consultant");
  const site = params.get("site");
  const rtt_status = params.get("rtt_status");
  const priority = params.get("priority");

  const pathways = await connectorRegistry.epr.getPathways();
  const filtered = pathways.filter((p) => {
    if (pathwayId && p.pathway_id !== pathwayId) return false;
    if (patientId && p.patient_id !== patientId) return false;
    if (specialty && p.specialty !== specialty) return false;
    if (consultant && p.consultant !== consultant) return false;
    if (site && p.site !== site) return false;
    if (rtt_status && p.rtt_status !== rtt_status) return false;
    if (priority && p.priority !== priority) return false;
    return true;
  });

  return NextResponse.json({
    data: filtered,
    updated_at: new Date().toISOString(),
  });
}
