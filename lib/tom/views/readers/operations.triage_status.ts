import { getPathwaysFromConnectors } from "@/lib/pathways/data";
import { applyFilterContext } from "@/lib/pathways/metrics";
import { computeTriageMetrics } from "@/lib/pathways/compute";
import { buildViewEvidence } from "./evidence";

const toFilterContext = (filters?: Record<string, any>) => ({
  specialty: filters?.specialty,
  consultant: filters?.consultant,
  site: filters?.site,
  date_from: filters?.date_from,
  date_to: filters?.date_to,
  search: filters?.search,
  rtt_status: filters?.rtt_status,
  stage: filters?.stage,
  priority: filters?.priority,
  owner_id: filters?.owner_id,
});

const buildTriageRows = (records: any[]) =>
  records
    .filter((item) => item && item.stage === "triage")
    .map((item) => {
      const waiting = typeof item.waiting_days === "number" ? item.waiting_days : Number(item.waiting_days || 0);
      const rtt = String(item.rtt_status || "").toLowerCase();
      const validation = String(item.validation_status || "").toLowerCase();
      const state = waiting > 14
        ? "overdue_triage"
        : validation === "required"
          ? "clarification_requested"
          : rtt === "at_risk"
            ? "reprioritization_pending"
            : "awaiting_consultant_review";
      return {
        patient_name: item.patient_name,
        consultant: item.consultant,
        waiting_days: waiting,
        priority: item.priority,
        rtt_status: item.rtt_status,
        state,
      };
    });

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const context = toFilterContext(params.filters);
  const sourcePathways = await getPathwaysFromConnectors();
  const data = applyFilterContext(sourcePathways, context);
  const metrics = computeTriageMetrics(data);
  const rows = buildTriageRows(data);
  return {
    data: {
      metrics: {
        awaiting_consultant_review: metrics.awaiting_review,
        overdue_triage: metrics.overdue_triage,
        clarification_requested: metrics.clarification,
        reprioritization_pending: metrics.reprioritization,
      },
      rows,
      context,
      updated_at: new Date().toISOString(),
    },
    evidence: [
      buildViewEvidence({
        view_id: "operations.triage_status",
        filters: params.filters,
        records: data,
        label: "Triage status pathways",
        value: rows.length,
      }),
    ],
  };
}
