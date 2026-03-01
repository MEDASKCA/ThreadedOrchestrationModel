import type { ToolDefinition } from "./types";
import { getPtlSummary } from "./epr";
import { getAlerts } from "./alerts";
import { getOpenAnomalies } from "./anomalies";
import { getReferralSummary } from "./pas";
import { getCommsSummary } from "./comms";
import { getStaffingSummary } from "./roster";
import { readView } from "./view-read";
import { runLlmGeneralAnswer } from "./llm-general-answer";
import { getPersonLookup } from "./workforce";

export const toolRegistry: ToolDefinition[] = [
  {
    name: "epr.ptl_summary",
    description: "PTL summary and waiters from EPR/PTL",
    inputSchema: {},
    outputSchema: { type: "object" },
    permission: "read:ptl",
    auditCategory: "PTL",
    run: async () => getPtlSummary(),
  },
  {
    name: "alerts.active",
    description: "Active operational alerts",
    inputSchema: {},
    outputSchema: { type: "array" },
    permission: "read:alerts",
    auditCategory: "Alerts",
    run: async () => getAlerts(),
  },
  {
    name: "anomalies.open",
    description: "Open anomalies from TOM anomaly engine",
    inputSchema: {},
    outputSchema: { type: "array" },
    permission: "read:anomalies",
    auditCategory: "Anomalies",
    run: async () => getOpenAnomalies(),
  },
  {
    name: "pas.referrals_summary",
    description: "Referral intake summary from PAS",
    inputSchema: {},
    outputSchema: { type: "object" },
    permission: "read:pas",
    auditCategory: "PAS",
    run: async () => getReferralSummary(),
  },
  {
    name: "comms.summary",
    description: "Comms threads/messages summary",
    inputSchema: {},
    outputSchema: { type: "object" },
    permission: "read:comms",
    auditCategory: "COMMS",
    run: async () => getCommsSummary(),
  },
  {
    name: "roster.staffing_summary",
    description: "Staffing summary from roster systems",
    inputSchema: {},
    outputSchema: { type: "object" },
    permission: "read:roster",
    auditCategory: "Roster",
    run: async () => getStaffingSummary(),
  },
  {
    name: "view.read",
    description: "Read current UI view via the ViewRegistry",
    inputSchema: { type: "object", properties: { view_id: { type: "string" }, filters: { type: "object" } }, required: ["view_id"] },
    outputSchema: { type: "object" },
    permission: "read:view",
    auditCategory: "View",
    run: async (input: any) => readView(input),
  },
  {
    name: "llm.general_answer",
    description: "General knowledge conversational answer",
    inputSchema: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] },
    outputSchema: { type: "object", properties: { answer: { type: "string" } } },
    permission: "read:public",
    auditCategory: "General",
    run: async (input: any) => runLlmGeneralAnswer({ prompt: String(input?.prompt || "") }),
  },
  {
    name: "workforce.person_lookup",
    description: "Look up a person by name across Staff Finder, roster, collaboration, and audit log",
    inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    outputSchema: { type: "object" },
    permission: "read:workforce",
    auditCategory: "Workforce",
    run: async (input: any) => getPersonLookup({ name: String(input?.name || "") }),
  },
];

export const getToolByName = (name: string) => toolRegistry.find((t) => t.name === name) ?? null;
