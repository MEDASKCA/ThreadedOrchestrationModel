import { prisma } from "@/lib/tom/db";
import type { ToolResult } from "./types";

export const getOpenAnomalies = async (): Promise<ToolResult<any[]>> => {
  try {
    const anomalies = await prisma.anomaly.findMany({
      where: { status: "open" },
      orderBy: { detectionDate: "desc" },
      take: 10,
    });
    return { ok: true, data: anomalies, source: "TOM Anomaly Engine" };
  } catch {
    return { ok: false, error: "Anomalies unavailable", source: "TOM Anomaly Engine" };
  }
};
