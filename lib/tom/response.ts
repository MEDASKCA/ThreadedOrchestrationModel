import { fetchIntegrationStatus, fetchTomAlerts, fetchPathways } from "@/lib/tom/client";
import { Thread } from "@/lib/collaboration";

export type TomResponse = {
  text: string;
  sources: string[];
};

const PLACEHOLDER_NOTICE =
  "I'm not seeing that in connected sources yet.";

const fetchPathwayContext = async (thread: Thread) => {
  if (!thread.linkedEntities?.pathwayId && !thread.linkedEntities?.patientId) {
    return null;
  }
  const params = new URLSearchParams();
  if (thread.linkedEntities.pathwayId) params.set("pathway_id", thread.linkedEntities.pathwayId);
  if (thread.linkedEntities.patientId) params.set("patient_id", thread.linkedEntities.patientId);
  const payload = await fetchPathways(Object.fromEntries(params.entries()));
  return Array.isArray(payload?.data) ? payload.data[0] : null;
};

export async function buildTomResponse(
  thread: Thread,
  prompt: string,
  provenance: string[]
): Promise<TomResponse> {
  const hasLinkedEntities = Object.values(thread.linkedEntities || {}).some(
    (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value))
  );

  if (!hasLinkedEntities || provenance.length === 0) {
    return { text: PLACEHOLDER_NOTICE, sources: [] };
  }

  if (prompt.includes("summarize")) {
    const context = await fetchPathwayContext(thread);
    if (!context) {
      return { text: PLACEHOLDER_NOTICE, sources: provenance };
    }
    return {
      text: `Summary: ${context.patient_name} (${context.specialty}) is in ${context.stage} with ${context.waiting_days} waiting days.`,
      sources: provenance,
    };
  }

  if (prompt.includes("risk")) {
    try {
      const result = await fetchTomAlerts();
      if (!result.alerts.length) {
        return { text: PLACEHOLDER_NOTICE, sources: provenance };
      }
      const details = result.alerts.map((alert) => `• ${alert.title}: ${alert.detail}`).join("\n");
      return { text: `Risk review (connected systems):\n${details}`, sources: provenance };
    } catch {
      return { text: PLACEHOLDER_NOTICE, sources: provenance };
    }
  }

  if (prompt.includes("sources")) {
    try {
      const status = await fetchIntegrationStatus();
      const sources = Object.entries(status.statuses || {})
        .map(([key, val]) => `${key} (${(val as any).connected ? "connected" : "not connected"})`);
      return { text: `Sources consulted: ${sources.join(", ")}.`, sources: provenance };
    } catch {
      return { text: `Sources consulted: ${provenance.join(", ")}.`, sources: provenance };
    }
  }

  return { text: "TOM is ready. Use @TOM summarize thread, @TOM what is at risk, or @TOM check sources.", sources: provenance };
}
