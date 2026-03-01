import { NextRequest, NextResponse } from "next/server";
import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import { evaluateAlerts } from "@/lib/tom/alerts";
import { TOM_FEATURE_FLAGS } from "@/lib/tom/flags";
import { prisma } from "@/lib/tom/db";

export async function GET(request: NextRequest) {
  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }
  const site = request.nextUrl.searchParams.get("site") ?? "Royal Infirmary";
  const pathways = await connectorRegistry.epr.getPathways();
  const stock = await connectorRegistry.inventory.getStock(site);
  const alerts = evaluateAlerts(pathways, stock);
  const statuses = await connectorRegistry.getAllStatuses();

  let anomalyAlerts: { id: string; severity: string; title: string; detail: string | null; source: string }[] = [];
  if (TOM_FEATURE_FLAGS.anomaliesV1) {
    const anomalies = await prisma.anomaly.findMany({
      where: { status: "open" },
      orderBy: { detectionDate: "desc" },
      take: 20,
    });
    anomalyAlerts = anomalies.map((anomaly) => ({
      id: anomaly.id,
      severity: anomaly.severity === "high" ? "critical" : anomaly.severity === "medium" ? "warning" : "info",
      title: `Anomaly: ${anomaly.metricName}`,
      detail: anomaly.explanation,
      source: "TOM Anomaly Engine",
    }));
  }

  return NextResponse.json({
    alerts: [...alerts, ...anomalyAlerts],
    site,
    sources: statuses,
    updated_at: new Date().toISOString(),
  });
}
