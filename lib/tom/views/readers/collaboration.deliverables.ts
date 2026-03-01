import { collaborationThreads } from "@/lib/collaboration";
import { buildViewEvidence } from "./evidence";

type Deliverable = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string;
  updatedAt?: string;
};

const openStatuses = new Set(["open", "in_progress", "at_risk", "blocked", "escalated"]);

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const view_id = "collaboration.deliverables";
  const items: Deliverable[] = collaborationThreads
    .filter((thread) => openStatuses.has(thread.status))
    .map((thread) => ({
      id: thread.id,
      title: thread.title,
      status: thread.status,
      priority: thread.priority,
      assigneeId: thread.ownerId,
      updatedAt: thread.updatedAt,
    }));

  return {
    data: { items, source: "collaboration_threads" },
    evidence: [buildViewEvidence({ view_id, filters: params.filters, records: items, label: "Collaboration deliverables", value: items.length })],
  };
}
