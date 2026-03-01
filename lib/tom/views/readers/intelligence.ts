import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildViewEvidence } from "./evidence";

type TheatreList = {
  id: string;
  date?: string;
  theatreName?: string;
  specialty?: string;
  utilizationPercentage?: number;
  estimatedRevenue?: number;
  totalCases?: number;
  status?: string;
};

type AccessLog = {
  id: string;
  userId?: string;
  userName?: string;
  action?: string;
  targetType?: string;
  targetName?: string;
  timestamp?: { toDate?: () => Date; seconds?: number };
};

function fmtTs(ts?: { toDate?: () => Date; seconds?: number }): string {
  if (!ts) return "--";
  try {
    const d = ts.toDate ? ts.toDate() : new Date((ts.seconds ?? 0) * 1000);
    return d.toISOString();
  } catch {
    return "--";
  }
}

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const view_id = "intelligence.overview";
  try {
    const [tlSnap, logsSnap] = await Promise.all([
      getDocs(query(collection(db, "theatreLists"), orderBy("date", "desc"), limit(20))),
      getDocs(query(collection(db, "messengerAuditLog"), orderBy("timestamp", "desc"), limit(30))),
    ]);

    const theatreLists: TheatreList[] = tlSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TheatreList));
    const auditLogs: AccessLog[] = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessLog));

    const avgUtil = theatreLists.length
      ? Math.round(theatreLists.reduce((acc, t) => acc + (t.utilizationPercentage ?? 0), 0) / theatreLists.length)
      : 0;
    const totalRevenue = theatreLists.reduce((acc, t) => acc + (t.estimatedRevenue ?? 0), 0);
    const totalCases = theatreLists.reduce((acc, t) => acc + (t.totalCases ?? 0), 0);

    const theatreTable = {
      columns: [
        { key: "date", label: "Date" },
        { key: "theatreName", label: "Theatre" },
        { key: "specialty", label: "Specialty" },
        { key: "totalCases", label: "Cases", align: "right" as const },
        { key: "utilizationPercentage", label: "Utilisation %", align: "right" as const },
        { key: "estimatedRevenue", label: "Est. Revenue", align: "right" as const },
        { key: "status", label: "Status" },
      ],
      rows: theatreLists.slice(0, 15).map((t) => ({
        date: t.date ?? "--",
        theatreName: t.theatreName ?? "--",
        specialty: t.specialty ?? "--",
        totalCases: t.totalCases ?? 0,
        utilizationPercentage: t.utilizationPercentage != null ? `${t.utilizationPercentage}%` : "--",
        estimatedRevenue: t.estimatedRevenue ? `GBP ${t.estimatedRevenue.toLocaleString()}` : "--",
        status: t.status ?? "--",
      })),
      row_badges: [
        {
          columnKey: "status",
          map: {
            complete: { variant: "ok" as const },
            planned: { variant: "info" as const },
            cancelled: { variant: "bad" as const },
          },
        },
      ],
    };

    const auditTable = {
      columns: [
        { key: "timestamp", label: "Timestamp" },
        { key: "userName", label: "User" },
        { key: "action", label: "Action" },
        { key: "target", label: "Target" },
      ],
      rows: auditLogs.slice(0, 20).map((l) => ({
        timestamp: fmtTs(l.timestamp),
        userName: l.userName ?? l.userId ?? "--",
        action: l.action ?? "--",
        target: l.targetName ?? l.targetType ?? "--",
      })),
    };

    const summary = {
      theatreCount: theatreLists.length,
      avgUtilisation: avgUtil,
      totalCases,
      totalRevenue,
      auditEventCount: auditLogs.length,
    };

    return {
      data: {
        summary,
        theatreLists,
        auditLogs,
        theatreTable,
        auditTable,
        source: "firestore",
      },
      evidence: [
        buildViewEvidence({
          view_id,
          filters: params.filters,
          records: theatreLists,
          label: "Theatre performance overview",
          value: theatreLists.length,
        }),
        buildViewEvidence({
          view_id: "intelligence.audit_log",
          filters: params.filters,
          records: auditLogs,
          label: "Audit log events",
          value: auditLogs.length,
        }),
      ],
    };
  } catch {
    return {
      data: { summary: {}, theatreLists: [], auditLogs: [], source: "fallback" },
      evidence: [buildViewEvidence({ view_id, filters: params.filters, records: [], label: "Intelligence overview", value: 0 })],
    };
  }
}
