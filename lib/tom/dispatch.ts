import { prisma } from "@/lib/tom/db";

type DispatchChannel = "in_app" | "email" | "teams" | "executive_report";

export const dispatchAlerts = async (
  anomalies: Array<{
    id: string;
    severity: string;
    metricName: string;
    scope: string;
    scopeId: string | null;
    explanation: string;
    transparencyPayload: unknown;
  }>,
) => {
  const payloads = anomalies.flatMap((anomaly) => {
    const base = {
      anomalyId: anomaly.id,
      metric: anomaly.metricName,
      scope: anomaly.scope,
      scopeId: anomaly.scopeId,
      severity: anomaly.severity,
      explanation: anomaly.explanation,
      transparency: anomaly.transparencyPayload,
    };

    const channels: DispatchChannel[] = ["in_app"];
    if (anomaly.severity === "high") {
      channels.push("teams");
    }
    return channels.map((channel) => ({
      channel,
      status: "queued",
      payload: base,
    }));
  });

  if (payloads.length === 0) return [];

  await prisma.alertDispatch.createMany({
    data: payloads.map((item) => ({
      anomalyId: item.payload.anomalyId,
      channel: item.channel,
      status: item.status,
      payload: item.payload as never,
    })),
  });

  return payloads;
};
