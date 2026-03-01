import { collaborationThreads } from "@/lib/collaboration";
import { buildViewEvidence } from "./evidence";

const activeStatuses = new Set(["open", "in_progress", "at_risk", "blocked", "escalated"]);

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const view_id = "collaboration.forum";
  const items = collaborationThreads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    status: thread.status,
    source: thread.source ?? "unknown",
    priority: thread.priority,
    is_active: activeStatuses.has(thread.status),
    updatedAt: thread.updatedAt,
  }));
  const table = {
    columns: [
      { key: "title", label: "Thread" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "source", label: "Source" },
      { key: "updatedAt", label: "Updated" },
    ],
    rows: items.slice(0, 25).map((item) => ({
      title: item.title,
      status: item.status,
      priority: item.priority,
      source: item.source,
      updatedAt: item.updatedAt,
    })),
    row_badges: [
      {
        columnKey: "status",
        map: {
          open: { variant: "info" as const },
          in_progress: { variant: "warn" as const },
          at_risk: { variant: "warn" as const },
          blocked: { variant: "bad" as const },
          escalated: { variant: "bad" as const },
        },
      },
    ],
  };

  return {
    data: { items, source: "collaboration_threads", table },
    evidence: [buildViewEvidence({ view_id, filters: params.filters, records: items, label: "Collaboration forum", value: items.length })],
  };
}
