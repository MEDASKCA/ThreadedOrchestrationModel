import { NextRequest, NextResponse } from "next/server";
import { connectorRegistry, initializeIntegrations } from "@/lib/integrations/registry";
import { RICH_RESPONSE_SCHEMA, type RichNextAction, type RichResponse } from "@/lib/tom/rich-response";
import { runTruthFirewall } from "@/lib/tom/truth-firewall";
import { getContext, getSessionId, updateContext } from "@/lib/tom/context";
import { executeAction } from "@/lib/tom/actions";
import { verifyResponse } from "@/lib/tom/verifier";
import { buildPtlNarrative, buildSmalltalkNarrative, buildStaffingNarrative } from "@/lib/tom/narrative";
import { buildExplanation, type ExplanationParams } from "@/lib/tom/narrative/explainer";
import { applyConversationPattern } from "@/lib/tom/narrative/patterns";
import { pickVariant, type VoiceContext, voiceClarifyQuestion, voiceSummary } from "@/lib/tom/narrative/voice";
import { dedupeLines } from "@/lib/tom/narrative/dedupe";
import { sanitizeRichResponse } from "@/lib/tom/narrative/sanitize";
import { logAudit } from "@/lib/tom/audit";
import { classifyIntent, classifyLocateEntityType, detectUnknownDomainWord, extractEntityName, isApprovalHelpQuery } from "@/lib/tom/reasoning/intent";
import { createTraceBase, type ReasoningTrace } from "@/lib/tom/reasoning/trace";
import { saveTrace } from "@/lib/tom/reasoning/trace-store";
import { getAuthorityForTool, getPrimaryAuthorityForIntent } from "@/lib/tom/reasoning/authority";
import { getContract, selectToolsForMessage, TOOL_CONTRACTS } from "@/lib/tom/reasoning/tool-contracts";
import { detectAuthorityConflicts } from "@/lib/tom/reasoning/conflicts";
import { buildAllowedFacts } from "@/lib/tom/reasoning/facts";
import { filterToolsByDomain, resolveClarificationDomainChoice } from "@/lib/tom/reasoning/clarification";
import { buildContinueActionFromTopic } from "@/lib/tom/reasoning/continuity";
import { extractPreferences } from "@/lib/tom/reasoning/preferences";
import { isPendingWorkQuery } from "@/lib/tom/reasoning/pending";
import { inferExploreSection, isExploreQuery, selectExploreViews } from "@/lib/tom/reasoning/explore";
import { shouldRouteConversationalDefault } from "@/lib/tom/reasoning/conversational-default";
import { dispatchKnowledge } from "@/lib/tom/knowledge/dispatcher";
import { enforceSingleQuestionText, resolveEmotionActionRoute } from "@/lib/tom/reasoning/emotion";
import { isExplainRequest } from "@/lib/tom/reasoning/explain-trigger";
import { parseUiCommand } from "@/lib/tom/reasoning/ui-command";
import { isWaitingListExtremesQuery } from "@/lib/tom/reasoning/waiting-list";
import { detectDomain } from "@/lib/tom/reasoning/domain";
import type { TomContext } from "@/lib/tom/context";
import { VIEW_REGISTRY } from "@/lib/tom/views/registry";
import { findRelevantViews } from "@/lib/tom/views/finder";
import { buildPendingSummary } from "@/lib/tom/views/pending";
import { buildSectionOverview } from "@/lib/tom/views/overview";
import { assessActionRisk, assessToolRisk } from "@/lib/tom/governance/risk";
import { normalizeApprovalChoice } from "@/lib/tom/governance/approval";
import { buildApprovalPreview, buildApprovalUserSummary, shouldRouteApprovalHelp } from "@/lib/tom/governance/approval-describe";
import { getReasoningAssistSkipReason, reasoningAssistRewrite, shouldUseReasoningAssist } from "@/lib/tom/llm/reasoning-assist";
import { planWithLLM, type PlannerDecision, type PlannerRequest } from "@/lib/tom/llm/planner";
import { gatePlannerDecision } from "@/lib/tom/reasoning/planner-gate";
import { runLlmGeneralAnswer } from "@/lib/tom/tools/llm-general-answer";
import type { Domain } from "@/lib/tom/reasoning/domain";
import { buildThinkPlan, type ReasoningStage, type ThinkPlan } from "@/lib/tom/reasoning/pipeline";
import { resolveLifecycleStage, type LifecycleStage } from "@/lib/tom/domain/access-pathways-lifecycle";
import type { PTLRow } from "@/lib/tom/pages/ptl";
import {
  countBySpecialty,
  countByStatus,
  countPatients,
  detectPtlQueryKind,
  findBreaches,
  findLongestWaiter,
  findUrgentBreaches,
  isPtlOperationalQuestion,
} from "@/lib/tom/pages/ptl-analyser";
import { normalizeWaitingListPage, type WaitingListManagementPage } from "@/lib/tom/pages/waiting-list";
import {
  detectWaitingListQueryKind,
  isWaitingListMacroQuestion,
  specialtiesWithCapacityGap,
  specialtyWithMaxAvgWait,
  specialtyWithMaxWaiting,
  summarizeTopSignals,
  totalWaiting,
} from "@/lib/tom/pages/waiting-list-analyser";
import { normalizeRTTPage, type RTTMonitoringPage } from "@/lib/tom/pages/rtt";
import {
  complianceSummary,
  isRttComplianceQuestion,
  overallCompliance,
  specialtiesBelowThreshold,
  specialtyWithLowestCompliance,
  specialtyWithMostBreaches,
} from "@/lib/tom/pages/rtt-analyser";
import { normalizeCancer2WWPage, type Cancer2WWPage } from "@/lib/tom/pages/cancer-2ww";
import {
  activeReferrals,
  detectCancer2WWQueryKind,
  highestRiskSpecialties,
  isCancer2WWQuery,
  safetyEscalations,
  summaryBullets as cancerSummaryBullets,
  totalBreaches as cancerTotalBreaches,
  urgentDiagnosticsPending,
} from "@/lib/tom/pages/cancer-2ww-analyser";
import { normalizeReferralManagementPage, type ReferralManagementPage } from "@/lib/tom/pages/referrals";
import {
  detectReferralQueryKind,
  isReferralQuery,
  longestWaitingReferral,
  pipelineCounts,
  referralsBySpecialty,
  summaryBullets as referralSummaryBullets,
} from "@/lib/tom/pages/referrals-analyser";
import { normalizeTriageStatusPage, type TriageStatusPage } from "@/lib/tom/pages/triage";
import {
  atRiskItems,
  detectTriageQueryKind,
  isTriageQuery,
  longestWaiting,
  queueCounts,
  summaryBullets as triageSummaryBullets,
  urgentItems,
} from "@/lib/tom/pages/triage-analyser";
import { normalizeBreachTrackingPage, type BreachTrackingPage } from "@/lib/tom/pages/breach-tracking";
import {
  breachesByCause,
  breachesBySpecialty,
  detectBreachQueryKind,
  isBreachTrackingQuery,
  longestBreach,
  summaryBullets as breachSummaryBullets,
  totalBreaches as totalBreachCount,
  unassignedBreaches,
} from "@/lib/tom/pages/breach-analyser";
import { normalizePathwayMilestonesPage, type PathwayMilestonesPage } from "@/lib/tom/pages/pathway-milestones";
import {
  bottleneckStages,
  detectMilestonesQueryKind,
  isMilestonesQuery,
  longestStage,
  stageDistribution,
  summaryBullets as milestonesSummaryBullets,
} from "@/lib/tom/pages/pathway-milestones-analyser";
import { normalizeClockStartsStopsPage, type ClockStartsStopsPage } from "@/lib/tom/pages/clock-events";
import {
  anomalyCounts,
  detectClockEventsQueryKind,
  isClockEventsQuery,
  mostRecentAnomalies,
  summaryBullets as clockSummaryBullets,
  totalAnomalyRows,
} from "@/lib/tom/pages/clock-events-analyser";
import { normalizeValidationDataQualityPage, type ValidationDataQualityPage } from "@/lib/tom/pages/data-quality";
import {
  detectDataQualityQueryKind,
  isDataQualityQuery,
  issueCounts,
  mostRecentIssues,
  summaryBullets as dataQualitySummaryBullets,
  totalIssueRows,
  unassignedRecords,
} from "@/lib/tom/pages/data-quality-analyser";

const TOM_LLM_MODEL = process.env.TOM_LLM_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type ChatRequest = {
  prompt?: string;
  action?: {
    type?: string;
    kind?: "domain_priority" | "missing_required_tool" | "approval";
    choice?: string;
  };
};

type ChatResponse = {
  response: string;
  rich?: RichResponse | null;
  sources: string[];
  topic: string | null;
  trace_id: string;
  debug_routing_path?: string;
  debug_reasoning_assist: boolean;
  debug_reasoning_assist_used?: boolean;
  debug_llm_planner_enabled: boolean;
  debug_llm_planner_used: boolean;
  debug_llm_planner_confidence?: number;
  debug_llm_planner_intent?: string;
  debug_domain?: Domain;
  debug_last_snapshot_available?: boolean;
  debug_llm_used?: boolean;
  debug_stage?: ReasoningStage;
  allowed_facts?: { count: number };
  provenance?: { used_fact_ids: string[] };
  trace?: { trace_id: string; route: { mode: "deterministic" | "llm_structured" | "llm_phrase"; reason: string; routing_path?: string }; outcome?: { status: "ok" | "fallback" | "blocked"; notes?: string } };
};

const TABLE_LIKE_STATUS_VALUES = ["on track", "breaching", "on duty", "active", "escalated", "blocked", "at risk"];

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizePriority = (value: unknown): PTLRow["priority"] => {
  const text = String(value || "").toLowerCase();
  if (text.includes("urgent")) return "urgent";
  if (text.includes("soon") || text.includes("expedited")) return "expedited";
  return "routine";
};

const normalizeRttStatus = (value: unknown): PTLRow["rtt_status"] => {
  const text = String(value || "").toLowerCase();
  if (text.includes("breach")) return "breaching";
  if (text.includes("risk")) return "at_risk";
  return "on_track";
};

const extractPtlRowsFromViewFacts = (facts: Record<string, unknown>): PTLRow[] => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const ptlEntry = views.find((entry) => entry.view_id === "operations.ptl");
  if (!ptlEntry) return [];
  const data = ptlEntry.data;
  const sourceRows =
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.rows) && data.rows) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.table?.rows) && data.table.rows) ||
    [];
  return sourceRows
    .filter((row: any) => row && typeof row === "object")
    .map((row: any) => ({
      patient_name: String(row.patient_name || row.patient || row.name || "").trim(),
      nhs_number: String(row.nhs_number || row.patient_id || row.ref || row.nhs || "").trim(),
      age: toNumber(row.age, 0),
      priority: normalizePriority(row.priority),
      procedure: row.procedure ? String(row.procedure) : undefined,
      consultant: row.consultant ? String(row.consultant) : undefined,
      specialty: String(row.specialty || "Unknown").trim(),
      duration_minutes: row.duration_minutes !== undefined ? toNumber(row.duration_minutes, 0) : (row.durationMins !== undefined ? toNumber(row.durationMins, 0) : undefined),
      waiting_days: toNumber(row.waiting_days ?? row.waitingDays, 0),
      rtt_target_weeks: toNumber(row.rtt_target_weeks, 18),
      rtt_status: normalizeRttStatus(row.rtt_status ?? row.rttStatus),
    }))
    .filter((row: PTLRow) => row.patient_name.length > 0 && Number.isFinite(row.waiting_days));
};

const WAITING_VIEW_IDS = [
  "operations.access_pathways_waiting_list",
  "operations.waiting_list_management",
  "operations.waiting",
] as const;

const extractWaitingListPageFromViewFacts = (facts: Record<string, unknown>): WaitingListManagementPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const waitingEntry = views.find((entry) => WAITING_VIEW_IDS.includes(entry.view_id as (typeof WAITING_VIEW_IDS)[number]));
  if (!waitingEntry) return null;
  const normalized = normalizeWaitingListPage(waitingEntry.data);
  return normalized;
};

const waitingTilesCount = (page: WaitingListManagementPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const RTT_VIEW_IDS = [
  "operations.access_pathways_rtt_monitoring",
  "operations.rtt",
] as const;

const extractRttPageFromViewFacts = (facts: Record<string, unknown>): RTTMonitoringPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const rttEntry = views.find((entry) => RTT_VIEW_IDS.includes(entry.view_id as (typeof RTT_VIEW_IDS)[number]));
  if (!rttEntry) return null;
  return normalizeRTTPage(rttEntry.data);
};

const rttTilesCount = (page: RTTMonitoringPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const CANCER_2WW_VIEW_IDS = [
  "operations.cancer_2ww",
  "operations.cancer",
] as const;

const extractCancer2WWPageFromViewFacts = (facts: Record<string, unknown>): Cancer2WWPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const cancerEntry = views.find((entry) => CANCER_2WW_VIEW_IDS.includes(entry.view_id as (typeof CANCER_2WW_VIEW_IDS)[number]));
  if (!cancerEntry) return null;
  return normalizeCancer2WWPage(cancerEntry.data);
};

const cancer2wwTilesCount = (page: Cancer2WWPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const REFERRAL_VIEW_IDS = [
  "operations.referral_management",
  "operations.referrals",
] as const;

const extractReferralPageFromViewFacts = (facts: Record<string, unknown>): ReferralManagementPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const referralEntry = views.find((entry) => REFERRAL_VIEW_IDS.includes(entry.view_id as (typeof REFERRAL_VIEW_IDS)[number]));
  if (!referralEntry) return null;
  return normalizeReferralManagementPage(referralEntry.data);
};

const referralTilesCount = (page: ReferralManagementPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const TRIAGE_VIEW_IDS = [
  "operations.triage_status",
  "operations.triage",
] as const;

const extractTriagePageFromViewFacts = (facts: Record<string, unknown>): TriageStatusPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const triageEntry = views.find((entry) => TRIAGE_VIEW_IDS.includes(entry.view_id as (typeof TRIAGE_VIEW_IDS)[number]));
  if (!triageEntry) return null;
  return normalizeTriageStatusPage(triageEntry.data);
};

const triageTilesCount = (page: TriageStatusPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const BREACH_VIEW_IDS = [
  "operations.breach_tracking",
  "operations.breach",
] as const;

const extractBreachPageFromViewFacts = (facts: Record<string, unknown>): BreachTrackingPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const breachEntry = views.find((entry) => BREACH_VIEW_IDS.includes(entry.view_id as (typeof BREACH_VIEW_IDS)[number]));
  if (!breachEntry) return null;
  return normalizeBreachTrackingPage(breachEntry.data);
};

const breachTilesCount = (page: BreachTrackingPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const MILESTONES_VIEW_IDS = [
  "operations.pathway_milestones",
  "operations.milestones",
] as const;

const extractMilestonesPageFromViewFacts = (facts: Record<string, unknown>): PathwayMilestonesPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const milestoneEntry = views.find((entry) => MILESTONES_VIEW_IDS.includes(entry.view_id as (typeof MILESTONES_VIEW_IDS)[number]));
  if (!milestoneEntry) return null;
  return normalizePathwayMilestonesPage(milestoneEntry.data);
};

const CLOCK_EVENTS_VIEW_IDS = [
  "operations.clock_starts_stops",
  "operations.clock",
] as const;

const extractClockEventsPageFromViewFacts = (facts: Record<string, unknown>): ClockStartsStopsPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const clockEntry = views.find((entry) => CLOCK_EVENTS_VIEW_IDS.includes(entry.view_id as (typeof CLOCK_EVENTS_VIEW_IDS)[number]));
  if (!clockEntry) return null;
  return normalizeClockStartsStopsPage(clockEntry.data);
};

const clockTilesCount = (page: ClockStartsStopsPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const DATA_QUALITY_VIEW_IDS = [
  "operations.validation_data_quality",
  "operations.validation",
] as const;

const extractDataQualityPageFromViewFacts = (facts: Record<string, unknown>): ValidationDataQualityPage | null => {
  const views = Array.isArray((facts as any).views) ? (facts as any).views as Array<{ view_id: string; data: any }> : [];
  const dqEntry = views.find((entry) => DATA_QUALITY_VIEW_IDS.includes(entry.view_id as (typeof DATA_QUALITY_VIEW_IDS)[number]));
  if (!dqEntry) return null;
  return normalizeValidationDataQualityPage(dqEntry.data);
};

const dataQualityTilesCount = (page: ValidationDataQualityPage): number =>
  Object.values(page.tiles).filter((value) => typeof value === "number" && Number.isFinite(value)).length;

const ACCESS_PATHWAYS_PAGE_LABELS: Record<ExplanationParams["page_type"], string> = {
  ptl: "PTL",
  waiting_list: "Waiting List Management",
  rtt: "RTT Monitoring",
  cancer_2ww: "Cancer Pathways (2WW)",
  referrals: "Referral Management",
  triage: "Triage Status",
  breach_tracking: "Breach Tracking",
  pathway_milestones: "Pathway Milestones",
  clock_events: "Clock Starts/Stops",
  data_quality: "Validation & Data Quality",
};

const ACCESS_PATHWAYS_VIEW_ID_BY_PAGE_TYPE: Record<ExplanationParams["page_type"], string> = {
  ptl: "operations.ptl",
  waiting_list: "operations.access_pathways_waiting_list",
  rtt: "operations.access_pathways_rtt_monitoring",
  cancer_2ww: "operations.cancer_2ww",
  referrals: "operations.referral_management",
  triage: "operations.triage_status",
  breach_tracking: "operations.breach_tracking",
  pathway_milestones: "operations.pathway_milestones",
  clock_events: "operations.clock_starts_stops",
  data_quality: "operations.validation_data_quality",
};

const lifecycleContextForStage = (stage: LifecycleStage): string => {
  switch (stage) {
    case "referral":
      return "This sits at referral intake — where new cases enter the pathway and are logged for triage.";
    case "triage":
      return "This is the triage phase — where referrals are clinically reviewed and prioritised.";
    case "waiting":
      return "This sits in the waiting phase of the pathway — where patients are queued for capacity and monitored against RTT targets.";
    case "pathway_progress":
      return "This is the pathway progress phase — tracking stage movement and flow delays across the pathway.";
    case "operational_tracking":
      return "This is the operational tracking layer — patient-level tracking of pathway status and risk.";
    case "compliance":
      return "This is the compliance layer of the pathway — measuring performance against 18-week and 52-week RTT standards.";
    case "cancer_compliance":
      return "This is the cancer compliance layer — monitoring 2WW performance against urgent pathway targets.";
    case "breach_accountability":
      return "This is breach accountability — tracking cases that exceeded RTT targets and ownership.";
    case "clock_audit":
      return "This is the clock audit layer — validating RTT clock start/stop integrity.";
    case "data_governance":
      return "This is data governance — validation and data quality controls for pathway records.";
    default:
      return "This sits within the pathway lifecycle.";
  }
};

const stripCheckedLine = (summary: string) => {
  const cleaned = summary.replace(/\s*Checked:\s.*$/i, "").trim();
  return cleaned.length > 0 ? cleaned : summary.trim();
};

const ensureSentence = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
};

const buildAccessPathwaysCheckedLine = (pageType: ExplanationParams["page_type"]) =>
  `Checked: Operations → Access & Pathways → ${ACCESS_PATHWAYS_PAGE_LABELS[pageType]}.`;

type AccessPathwaysNarrative = {
  lifecycleStage: LifecycleStage;
  lifecycleContext: string;
  checkedLine: string;
  implication?: string;
  crossPageChecked: boolean;
  crossPageDataUsed: RichResponse["data_used"];
};

const buildAccessPathwaysNarrative = (params: {
  context: Omit<ExplanationParams, "mode">;
  ptlViewRead: boolean;
  ptlRows: PTLRow[];
  waitingPage: WaitingListManagementPage | null;
  waitingEvidence?: { source?: string } | null;
  breachPage: BreachTrackingPage | null;
  breachEvidence?: { source?: string } | null;
  breachViewRead: boolean;
}): AccessPathwaysNarrative => {
  const viewId = ACCESS_PATHWAYS_VIEW_ID_BY_PAGE_TYPE[params.context.page_type];
  const lifecycleStage = resolveLifecycleStage(viewId);
  const lifecycleContext = lifecycleContextForStage(lifecycleStage);
  const checkedLine = buildAccessPathwaysCheckedLine(params.context.page_type);

  let implication: string | undefined;
  let crossPageChecked = false;
  const crossPageDataUsed: RichResponse["data_used"] = [];

  if (params.context.page_type === "rtt" && params.breachViewRead && params.breachPage) {
    crossPageChecked = true;
    const breachTotal = totalBreachCount(params.breachPage);
    if (breachTotal > 0) {
      implication = `This aligns with ${breachTotal} recorded breach${breachTotal === 1 ? "" : "es"} in Breach Tracking.`;
      crossPageDataUsed.push({
        source: params.breachEvidence?.source || "view.read:operations.breach_tracking",
        label: "Total breaches",
        value: breachTotal,
      });
    }
  }

  if (params.context.page_type === "waiting_list" && params.ptlViewRead && params.waitingPage) {
    crossPageChecked = true;
    const waitingTotal = totalWaiting(params.waitingPage);
    const ptlCount = params.ptlRows.length;
    if (waitingTotal === null) {
      implication = "Waiting list total not available to reconcile with PTL — verification required.";
    } else {
      implication = waitingTotal === ptlCount
        ? "PTL count aligns with the waiting list total."
        : "Counts differ from PTL — verification required.";
      crossPageDataUsed.push({
        source: params.waitingEvidence?.source || "view.read:operations.access_pathways_waiting_list",
        label: "Total waiting list",
        value: waitingTotal,
      });
    }
    crossPageDataUsed.push({
      source: "view.read:operations.ptl",
      label: "PTL rows",
      value: ptlCount,
    });
  }

  return {
    lifecycleStage,
    lifecycleContext,
    checkedLine,
    implication,
    crossPageChecked,
    crossPageDataUsed,
  };
};

const applyNarrativeExplanation = (
  base: RichResponse,
  context: Omit<ExplanationParams, "mode">,
  mode: "concise" | "expanded",
  accessPathways?: AccessPathwaysNarrative,
): RichResponse => {
  const explanation = buildExplanation({ ...context, mode });
  const firstBody = mode === "concise"
    ? "Short evidence-grounded summary."
    : "Structured explanation based on the checked page payload.";
  const sections = [
    {
      heading: mode === "concise" ? "What I checked" : "Explanation",
      body: firstBody,
      bullets: explanation.bullets ?? [],
    },
  ];
  return {
    ...base,
    title: explanation.title || base.title,
    summary: accessPathways
      ? [
        ensureSentence(accessPathways.lifecycleContext),
        ensureSentence(stripCheckedLine(explanation.summary)),
        accessPathways.implication ? ensureSentence(accessPathways.implication) : null,
        accessPathways.checkedLine,
      ].filter(Boolean).join(" ")
      : explanation.summary,
    voice_summary: accessPathways
      ? [
        ensureSentence(accessPathways.lifecycleContext),
        ensureSentence(stripCheckedLine(explanation.summary)),
        accessPathways.implication ? ensureSentence(accessPathways.implication) : null,
        accessPathways.checkedLine,
      ].filter(Boolean).join(" ")
      : explanation.summary,
    sections,
    data_used: accessPathways
      ? [...base.data_used, ...accessPathways.crossPageDataUsed]
      : base.data_used,
  };
};

const toTitle = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const coerceTableFromViewData = (data: any) => {
  if (data?.table && Array.isArray(data.table.columns) && Array.isArray(data.table.rows)) {
    return data.table as {
      columns: Array<{ key: string; label: string; align?: "left" | "right" | "center"; width?: number }>;
      rows: Array<Record<string, string | number | null>>;
      row_badges?: Array<{ columnKey: string; map: Record<string, { variant: "good" | "warn" | "bad" | "info" }> }>;
    };
  }
  const rowsSource =
    (Array.isArray(data?.rows) && data.rows) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data) ? data : null);
  if (!Array.isArray(rowsSource) || rowsSource.length === 0) return null;
  const objectRows = rowsSource.filter((row: any) => row && typeof row === "object");
  if (objectRows.length === 0) return null;
  const keys = Array.from(
    new Set(
      objectRows.flatMap((row) => Object.keys(row as Record<string, unknown>)),
    ),
  ).slice(0, 8);
  if (keys.length === 0) return null;
  const columns = keys.map((key) => ({
    key,
    label: toTitle(key),
    align: objectRows.some((row) => typeof (row as any)[key] === "number") ? "right" as const : "left" as const,
  }));
  const rows = objectRows.slice(0, 25).map((row) => {
    const out: Record<string, string | number | null> = {};
    for (const key of keys) {
      const raw = (row as any)[key];
      out[key] = typeof raw === "string" || typeof raw === "number" || raw === null ? raw : raw === undefined ? null : String(raw);
    }
    return out;
  });
  const row_badges = keys.flatMap((key) => {
    const values = rows.map((row) => String(row[key] ?? "")).filter(Boolean);
    if (!values.some((value) => TABLE_LIKE_STATUS_VALUES.some((status) => value.toLowerCase().includes(status)))) {
      return [];
    }
    const map: Record<string, { variant: "good" | "warn" | "bad" | "info" }> = {};
    for (const value of values) {
      const normalized = value.toLowerCase();
      if (normalized.includes("breach") || normalized.includes("blocked") || normalized.includes("escalated")) {
        map[value] = { variant: "bad" };
      } else if (normalized.includes("risk") || normalized.includes("warn")) {
        map[value] = { variant: "warn" };
      } else if (normalized.includes("active") || normalized.includes("on duty")) {
        map[value] = { variant: "info" };
      } else if (normalized.includes("on track")) {
        map[value] = { variant: "good" };
      }
    }
    return Object.keys(map).length > 0 ? [{ columnKey: key, map }] : [];
  });
  return {
    columns,
    rows,
    row_badges: row_badges.length > 0 ? row_badges : undefined,
  };
};

type FallbackIntent = "no_match" | "small_talk" | "missing_detail" | "unconnected_domain";

const isLongestWaiterRequest = (text: string) => {
  const t = text.toLowerCase();
  return (
    t.includes("longest waiting") ||
    t.includes("longest waiter") ||
    t.includes("longest wait") ||
    t.includes("oldest wait")
  );
};

const buildFallbackTitle = (intent: FallbackIntent) => {
  switch (intent) {
    case "small_talk":
      return "Hello";
    case "missing_detail":
      return "Need a bit more detail";
    case "unconnected_domain":
      return "Not connected yet";
    case "no_match":
    default:
      return "No matching data found";
  }
};

const buildFallbackSummary = (intent: FallbackIntent) => {
  switch (intent) {
    case "small_talk":
      return "I can help with PTL status, waiting list pressure, breaches, and risk signals from connected systems.";
    case "missing_detail":
      return "Tell me which Access & Pathways page to check: PTL, Waiting List, RTT, Cancer 2WW, Referrals, Triage, Breach Tracking, Milestones, Clock, Validation.";
    case "unconnected_domain":
      return "I don't currently have visibility of that data.";
    case "no_match":
    default:
      return "I'm not seeing any records that match that right now.";
  }
};

const buildFallbackActions = (intent: FallbackIntent): RichNextAction[] => {
  switch (intent) {
    case "small_talk":
      return [
        { label: "PTL summary", rationale: "See the latest operational view.", action_type: "open" },
        { label: "Show at-risk pathways", rationale: "Surface immediate risk.", action_type: "filter" },
        { label: "Why are we breaching?", rationale: "Check risk drivers.", action_type: "ask" },
      ];
    case "missing_detail":
      return [
        { label: "Open PTL", rationale: "Start with patient-level tracking.", action_type: "open" },
        { label: "Open Waiting List", rationale: "Start with aggregate waiting pressure.", action_type: "open" },
        { label: "Open RTT Monitoring", rationale: "Start with compliance view.", action_type: "open" },
      ];
    case "unconnected_domain":
      return [
        { label: "Connect source system", rationale: "Enable data access.", action_type: "connect" },
        { label: "Show connected sources", rationale: "See available coverage.", action_type: "ask" },
        { label: "Use Access & Pathways", rationale: "Operate with available data.", action_type: "open" },
      ];
    case "no_match":
    default:
      return [
        { label: "Lower the threshold", rationale: "Broaden results.", action_type: "filter" },
        { label: "Filter by specialty", rationale: "Target a service line.", action_type: "filter" },
        { label: "Check connected sources", rationale: "Confirm coverage.", action_type: "ask" },
      ];
  }
};

const buildFallbackResponse = (intent: FallbackIntent, connected: string[], missing: string[], signal: RichResponse["signal_strength"]) => {
  const summary = buildFallbackSummary(intent);
  return {
    title: buildFallbackTitle(intent),
    summary,
    voice_summary: summary,
    sections: [
      {
        heading: "At a glance",
        body: connected.length ? `Connected sources: ${connected.join(" - ")}.` : "No connected sources.",
        bullets: missing.length ? [`Missing: ${missing.join(", ")}`] : ["All required sources are connected."],
      },
    ],
    tables: [],
    next_actions: buildFallbackActions(intent).map((action, idx) => ({
      ...action,
      payload: {},
      action_id: `act_fallback_${idx}`,
      requires_confirmation: action.action_type !== "open",
    })),
    context_cards: [],
    data_used: [
      { source: "TOM", label: "Connected sources", value: connected.join(", ") || "None" },
      { source: "TOM", label: "Missing sources", value: missing.join(", ") || "None" },
    ],
    confidence: { level: "low", rationale: "Limited evidence available." },
    signal_strength: signal,
  } satisfies RichResponse;
};

const callOpenAiStructured = async (payload: {
  prompt: string;
  dataContext?: Record<string, unknown>;
  fallback: RichResponse;
}): Promise<RichResponse | null> => {
  if (!OPENAI_API_KEY) return null;
  const system = [
    "You are TOM — embedded inside MEDASKCA, an NHS operational decision support platform. You do not provide clinical diagnosis.",
    "You operate using the active page context and connected internal systems (EPR/PTL/Waiting List, HealthRoster/workforce, collaboration threads/deliverables, governance/audit logs).",
    "",
    "ABSOLUTE RULE: Never respond with ‘I can help with that — could you tell me more’ when the user provides a specific named entity (e.g. a two-word name like ‘Chioma Eze’, ‘Marcus Osei’) or an identifier. Treat it as a direct lookup request.",
    "",
    "LOOKUP ORDER (always):",
    "1) ACTIVE PAGE CONTEXT FIRST — if the current view contains a table/list, attempt to match the name against visible rows (exact > partial > fuzzy). If a match is found: respond with a concise contextual summary of the matched row(s), and provide 2–4 next actions relevant to this module. If multiple matches: list them briefly and ask the user to pick one (by specialty/site/waiting days), then proceed.",
    "2) IF NOT FOUND ON PAGE, CHECK NEAREST RELEVANT INTERNAL SOURCES — choose sources based on current module: Operations/PTL → PTL pathways, waiting list, RTT status, milestones; Logistics → Staff Finder, roster, allocation, absence; Collaboration → threads, deliverables, huddles; Governance → audit/governance logs.",
    "",
    "CRITICAL UX RULE: Do NOT repeatedly say ‘No matches found.’ If the name is not found: say what you checked in one short line, then immediately offer productive next steps (e.g. ‘Search across all sites’, ‘Search by NHS number / MRN’, ‘Check staff directory instead’, ‘Search collaboration threads for mentions’). Ask ONE clarifying question that helps disambiguate without burdening the user, e.g. ‘Is this a patient in PTL, or a member of staff? If you have an NHS number or site/specialty, share it and I’ll narrow it down.’",
    "",
    "OUTPUT STYLE: British English, calm and human-professional (like a helpful colleague). Always give something actionable. For any successful match, include a 3–6 bullet summary (specialty/procedure/wait time/status/consultant where available). Always end with 2–4 Next actions specific to the current module — never ‘Switch back to Operations’.",
    "",
    "DATA RULES: Use the verified data from DATA_JSON to answer. Reference actual numbers naturally in your summary. Do not invent numbers or facts not present in DATA_JSON. If data is missing, say so plainly in one sentence then move to next steps.",
    "",
    "RESPONSE FORMAT: Return valid JSON with these fields: title, summary, voice_summary, sections, tables, next_actions, data_used, context_cards, confidence, signal_strength.",
    "title: short descriptive label (e.g. ‘PTL: 3 Breaching RTT’ or ‘Chioma Eze — Cardiology’). Never echo the user’s question as the title.",
    "summary: 2–3 flowing sentences. Reference real numbers. Sound like a colleague giving a briefing, not a system generating output. Use **bold** markdown to emphasise critical numbers or key findings.",
    "sections body: conversational, direct prose. Use **bold** for key facts, thresholds, and names. No bullet overload.",
    "sections: array of {heading, body, bullets, type} objects. type is ‘text’ or ‘table’.",
  ].join("\n");

  const user = `User: ${payload.prompt}

DATA_JSON:
${JSON.stringify(payload.dataContext ?? {})}

FALLBACK_JSON:
${JSON.stringify(payload.fallback)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TOM_LLM_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? null;
  if (typeof text !== "string") return null;
  try {
    const parsed = JSON.parse(text);
    // Merge with fallback to ensure all required fields are present
    return {
      ...payload.fallback,
      title: parsed.title || payload.fallback.title,
      summary: parsed.summary || payload.fallback.summary,
      voice_summary: parsed.voice_summary || parsed.summary || payload.fallback.voice_summary,
    } as RichResponse;
  } catch {
    return null;
  }
};

const parseConfirmAction = (text: string) => {
  const match = text.toLowerCase().match(/confirm[:\s]+(act_[a-z0-9]+)/i);
  return match ? match[1] : null;
};

const intentConfidenceFromLevel = (level: "low" | "medium" | "high") => {
  if (level === "high") return 0.9;
  if (level === "medium") return 0.6;
  return 0.3;
};

const persistTrace = async (trace: ReasoningTrace) => {
  try {
    await saveTrace(trace);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[tom.chat.trace] save failed", error);
    }
  }
};

const isExplicitMultiDomainRequest = (message: string) => {
  const t = message.toLowerCase();
  const hasConnector = /\band\b|,|\balso\b|\bplus\b/.test(t);
  const groups = [
    t.includes("ptl") || t.includes("waiting") || t.includes("rtt") || t.includes("patient"),
    t.includes("staff") || t.includes("staffing") || t.includes("rota") || t.includes("roster"),
    t.includes("alerts"),
    t.includes("anomal"),
    t.includes("referral"),
    t.includes("comms") || t.includes("communications"),
  ].filter(Boolean).length;

  return (hasConnector && groups >= 2) || (t.includes("ptl") && (t.includes("staff") || t.includes("staffing") || t.includes("rota")));
};

const isSmalltalkOrUnsupported = (intent: string) => intent === "smalltalk" || intent === "unsupported_domain";
const isIntegrationCoverageQuery = (message: string) =>
  /(connected sources|integrations|what systems|data visibility|not connected|sources\s*&\s*evidence|sources and evidence)/i.test(message);
const isPlanningLikeQuery = (message: string) =>
  /\b(plan|session plan|this week|schedule|checklist)\b/i.test(message);
const isPtlTrackerQuery = (message: string) =>
  /\b(ptl|breach|breaches|waiting list|rtt)\b/i.test(message);
const isExplicitMetricClarifyQuery = (message: string) =>
  /\b(ptl|waiting list|rtt|breach|breaches|high waiters|metric)\b/i.test(message);
const isStateChangingPrompt = (message: string) =>
  /\b(create|update|delete|assign|write|save)\b/i.test(message);
const SECTION_KEYWORDS = ["operations", "logistics", "planning", "collaboration", "intelligence", "settings"] as const;
const SECTION_OVERVIEW_PHRASES = ["tell me about", "about", "overview", "what is in", "what can you do in"] as const;
const detectSnapshotSection = (message: string): string | null => {
  const text = String(message || "").toLowerCase().trim();
  if (!text) return null;
  const hasSnapshotCue =
    text.includes("snapshot") ||
    text.includes("quick view") ||
    text.includes("overview");
  if (!hasSnapshotCue) return null;
  for (const section of SECTION_KEYWORDS) {
    if (text.includes(section)) return section;
  }
  return null;
};
const detectSectionOverview = (message: string): { section: string | null; isOverview: boolean } => {
  const text = String(message || "").toLowerCase().trim();
  if (!text) return { section: null, isOverview: false };

  let section: string | null = null;
  for (const key of SECTION_KEYWORDS) {
    if (text === key || text.includes(key)) {
      section = key;
      break;
    }
  }
  if (!section) return { section: null, isOverview: false };
  if (text === section) return { section, isOverview: true };

  const hasOverviewPhrase = SECTION_OVERVIEW_PHRASES.some((phrase) => text.includes(phrase));
  return { section, isOverview: hasOverviewPhrase };
};

const deriveViewIdFromPageContext = (pageContext?: { section: string; view?: string }) => {
  if (!pageContext) return null;
  const section = pageContext.section;
  const view = pageContext.view || "unknown";
  if (section === "operations") {
    if (view === "waiting" || view === "waiting-list" || view === "waiting-list-management" || view === "waiting_list_management" || view === "wl-management") {
      return "operations.access_pathways_waiting_list";
    }
    if (view === "rtt" || view === "rtt-monitoring") return "operations.access_pathways_rtt_monitoring";
    if (view === "cancer" || view === "cancer-2ww" || view === "2ww" || view === "two-week-wait") return "operations.cancer_2ww";
    if (view === "referrals" || view === "referral-management" || view === "referral_management") return "operations.referral_management";
    if (view === "triage" || view === "triage-status" || view === "triage_status") return "operations.triage_status";
    if (view === "breach" || view === "breaches" || view === "breach-tracking" || view === "breach_tracking") return "operations.breach_tracking";
    if (view === "milestones" || view === "pathway-milestones" || view === "pathway_milestones") return "operations.pathway_milestones";
    if (view === "clock" || view === "clock-starts-stops" || view === "clock_starts_stops" || view === "clock-start") return "operations.clock_starts_stops";
    if (view === "validation" || view === "validation-data-quality" || view === "validation_data_quality") return "operations.validation_data_quality";
    if (view === "ptl") return "operations.ptl";
  }
  if (section === "logistics") {
    if (view === "roster" || view === "shifts") return "logistics.roster_shifts";
    if (view === "inventory" || view === "stockLevels") return "logistics.inventory_stock";
  }
  return `${section}.${view}`;
};

const derivePendingWorkViewIdFromPageContext = (pageContext?: { section: string; view?: string }) => {
  if (!pageContext) return null;
  const section = String(pageContext.section || "").toLowerCase();
  const view = String(pageContext.view || "").toLowerCase();
  if (section === "planning") {
    if (!view || view === "sessions" || view === "schedule") return "planning.sessions";
    if (view === "roster" || view === "roster_shifts" || view === "shifts") return "planning.roster_shifts";
    return "planning.sessions";
  }
  if (section === "collaboration") {
    if (!view || view === "deliverables" || view === "tasks") return "collaboration.deliverables";
    if (view === "forum" || view === "threads") return "collaboration.forum";
    return "collaboration.deliverables";
  }
  if (section === "intelligence") {
    if (view === "audit_log" || view === "audit") return "intelligence.audit_log";
    if (view === "theatre_lists" || view === "theatre") return "intelligence.theatre_lists";
    return "intelligence.overview";
  }
  return null;
};

const viewIdToDeeplink = (viewId: string) => {
  if (viewId === "planning.sessions") return "/?section=planning&view=sessions";
  if (viewId === "planning.roster_shifts") return "/?section=planning&view=roster_shifts";
  if (viewId === "collaboration.deliverables") return "/?section=collaboration&view=deliverables";
  if (viewId === "collaboration.forum") return "/?section=collaboration&view=forum";
  if (viewId === "operations.ptl") return "/?section=operations&view=ptl";
  if (viewId === "operations.waiting_list_management") return "/?section=operations&view=waiting";
  if (viewId === "operations.waiting") return "/?section=operations&view=waiting";
  if (viewId === "operations.access_pathways_waiting_list") return "/?section=operations&view=waiting";
  if (viewId === "operations.access_pathways_rtt_monitoring") return "/?section=operations&view=rtt";
  if (viewId === "operations.cancer_2ww" || viewId === "operations.cancer") return "/?section=operations&view=cancer";
  if (viewId === "operations.referral_management" || viewId === "operations.referrals") return "/?section=operations&view=referrals";
  if (viewId === "operations.triage_status" || viewId === "operations.triage") return "/?section=operations&view=triage";
  if (viewId === "operations.breach_tracking" || viewId === "operations.breach") return "/?section=operations&view=breach";
  if (viewId === "operations.pathway_milestones" || viewId === "operations.milestones") return "/?section=operations&view=milestones";
  if (viewId === "operations.clock_starts_stops" || viewId === "operations.clock") return "/?section=operations&view=clock";
  if (viewId === "operations.validation_data_quality" || viewId === "operations.validation") return "/?section=operations&view=validation";
  if (viewId === "logistics.roster_shifts") return "/?section=logistics&view=roster";
  if (viewId === "logistics.inventory_stock") return "/?section=logistics&view=inventory";
  return "";
};

const buildPlanningCanvasMarkdown = () => [
  "## Objectives",
  "- [ ] Define the main outcome",
  "- [ ] Confirm scope and dependencies",
  "",
  "## Constraints",
  "- [ ] Capacity and availability",
  "- [ ] Policy and operational limits",
  "",
  "## Checklist",
  "- [ ] Gather required inputs",
  "- [ ] Draft sequence of actions",
  "- [ ] Confirm owners and handoffs",
  "",
  "## Risks",
  "- [ ] Identify blockers early",
  "- [ ] Define fallback path",
  "",
  "## Next steps",
  "- [ ] Start with the first actionable item",
  "- [ ] Review progress and adjust",
].join("\n");

const buildExploreCanvasMarkdown = (viewLabels: string[]) => [
  "## Explore results",
  "",
  "Views sampled:",
  ...viewLabels.map((label) => `- ${label}`),
  "",
  "## Next steps",
  "- [ ] Open one view and inspect rows",
  "- [ ] Ask for PTL breaches or high waiters",
  "- [ ] Ask for RTT or waiting list detail",
].join("\n");

const buildScratchpadCanvasMarkdown = () => "# Scratchpad\n- [ ] What are we working on?\n";

const buildConversationalDefaultResponse = (): RichResponse => ({
  title: "Tell me what you want to do.",
  summary: "I can open a page, show a snapshot, or help you plan. What outcome are you aiming for?",
  voice_summary: "I can open a page, show a snapshot, or help you plan. What outcome are you aiming for?",
  sections: [],
  tables: [],
  next_actions: [
    {
      label: "Operations overview",
      rationale: "See the Operations pages and entry points.",
      action_type: "open",
      payload: { type: "open_view", deeplink: "/?section=operations", label: "Operations overview" },
    },
    {
      label: "Planning overview",
      rationale: "See Planning pages and workflows.",
      action_type: "open",
      payload: { type: "open_view", deeplink: "/?section=planning", label: "Planning overview" },
    },
    {
      label: "Show something useful",
      rationale: "Start with a quick explore snapshot.",
      action_type: "ask",
      payload: { type: "clarify", kind: "missing_required_tool", choice: "show me any data you have" },
    },
    {
      label: "Open week plan canvas",
      rationale: "Start with a deterministic planning template.",
      action_type: "open",
      payload: {
        type: "open_canvas",
        canvas: {
          title: "Plan my week",
          kind: "plan",
          markdown: buildPlanningCanvasMarkdown(),
        },
      },
    },
  ],
  context_cards: [],
  data_used: [],
  confidence: { level: "low", rationale: "No data access required for this guidance response." },
  signal_strength: { level: "low", score: 5, rationale: "Guidance-only response." },
});

const detectRequestedStateAction = (message: string) => {
  const text = message.toLowerCase();
  if (text.includes("save") && text.includes("plan")) {
    return { type: "save_session_plan", payload: { intent: "planning", note: "requested_by_user" } };
  }
  if (text.includes("create") && text.includes("session")) {
    return { type: "create_session", payload: { intent: "planning", note: "requested_by_user" } };
  }
  if (text.includes("update") && text.includes("session")) {
    return { type: "update_session", payload: { intent: "planning", note: "requested_by_user" } };
  }
  if (isStateChangingPrompt(message)) {
    return { type: "write_request", payload: { note: "requested_by_user" } };
  }
  return null;
};

const buildApprovalActions = () => {
  const now = Date.now();
  return [
    {
      label: "Approve",
      rationale: "Proceed with this action.",
      action_type: "ask" as const,
      action_id: `act_approve_${now}`,
      requires_confirmation: false,
      payload: { type: "approve", kind: "approval", choice: "yes" },
    },
    {
      label: "Cancel",
      rationale: "Do not perform this action.",
      action_type: "ask" as const,
      action_id: `act_approve_cancel_${now}`,
      requires_confirmation: false,
      payload: { type: "approve", kind: "approval", choice: "no" },
    },
  ];
};

const uniqueStableSubset = (candidateIds: string[], allowedIds: string[]) => {
  const allowedSet = new Set(allowedIds);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const id of candidateIds) {
    if (!allowedSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

const buildClarificationResponse = (
  input: { kind: "domain_priority" | "missing_required_tool"; domains?: string[]; tools?: string[] },
  preferences?: NonNullable<TomContext["preferences"]>,
): RichResponse => {
  const domainLabelMap: Record<string, string> = {
    epr: "PTL",
    roster: "Staffing",
    planning: "Planning tasks",
    collaboration: "Collaboration deliverables",
    inventory: "Inventory",
    opcs: "OPCS",
    comms: "Comms",
    governance: "Governance",
    access_pathways: "Referrals",
  };
  if (input.kind === "domain_priority") {
    const domains = input.domains ?? [];
    const domainList = domains.join(", ");
    const questionBase = `I can help with ${domainList}. Which should I prioritise first?`;
    const question = preferences?.tone === "formal"
      ? `I can support ${domainList}. Which domain should be prioritised first?`
      : questionBase;
    return {
      title: "Clarification needed",
      summary: question,
      voice_summary: question,
      sections: [
        {
          heading: "Choose one",
          body: "Reply with one option to continue.",
          bullets: domains.map((domain) => domainLabelMap[domain] ?? domain.toUpperCase()),
        },
      ],
      tables: [],
      next_actions: [
        ...domains.map((domain, idx) => ({
          label: domainLabelMap[domain] ?? domain.toUpperCase(),
          rationale: "Prioritise this domain first.",
          action_type: "ask" as const,
          payload: { type: "clarify", kind: "domain_priority", choice: domain },
          action_id: `act_clarify_${idx}`,
          requires_confirmation: false,
        })),
        {
          label: "Open Clarification Canvas",
          rationale: "Capture what I need from you to continue.",
          action_type: "open" as const,
          payload: {
            type: "open_canvas",
            canvas: {
              title: "What I need from you",
              kind: "checklist",
              markdown: "## What I need from you\n- [ ] Pick one priority area\n- [ ] Confirm the scope you want first",
            },
          },
        },
      ],
      context_cards: [],
      data_used: [],
      confidence: { level: "medium", rationale: "Waiting for explicit user priority." },
      signal_strength: { level: "low", score: 20, rationale: "Clarification required before tool execution." },
      provenance: { used_fact_ids: [] },
    };
  }

  const optionMap: Record<string, { label: string; choice: string; rationale: string }> = {
    epr: { label: "PTL", choice: "epr", rationale: "Use patient tracking data." },
    roster: { label: "Staffing", choice: "roster", rationale: "Use roster and workforce data." },
    governance: { label: "Alerts", choice: "governance", rationale: "Use active alert feeds." },
    access_pathways: { label: "Referrals", choice: "access_pathways", rationale: "Use PAS referral data." },
    comms: { label: "Comms", choice: "comms", rationale: "Use communication summaries." },
    planning: { label: "Planning tasks", choice: "planning", rationale: "Check planning task views first." },
    collaboration: { label: "Collaboration deliverables", choice: "collaboration", rationale: "Check collaboration views first." },
    alerts: { label: "Alerts", choice: "governance", rationale: "Check alerts and anomalies first." },
  };
  const selectedOptions = (input.tools && input.tools.length > 0)
    ? input.tools.map((raw) => {
      const key = raw.toLowerCase();
      return optionMap[key] ?? { label: raw, choice: key, rationale: "Use this area first." };
    })
    : [
      optionMap.epr,
      optionMap.roster,
      optionMap.governance,
      optionMap.access_pathways,
      optionMap.comms,
    ];
  const missing = selectedOptions.map((opt) => opt.label).join(", ");
  const questionBase = `I need one detail to continue: ${missing}.`;
  const question = preferences?.tone === "formal"
    ? `One detail is required to continue: ${missing}.`
    : questionBase;
  return {
    title: "Need one detail",
    summary: question,
    voice_summary: question,
    sections: [
      {
        heading: "Reply with one option",
        body: "Choose one option to continue.",
        bullets: selectedOptions.map((opt) => opt.label),
      },
    ],
    tables: [],
    next_actions: [
      ...selectedOptions.map((option, idx) => ({
        label: option.label,
        rationale: option.rationale,
        action_type: "ask" as const,
        payload: { type: "clarify", kind: "missing_required_tool", choice: option.choice },
        action_id: `act_clarify_missing_${idx}`,
        requires_confirmation: false,
      })),
      {
        label: "Open Clarification Canvas",
        rationale: "Capture what I need from you to continue.",
        action_type: "open" as const,
        payload: {
          type: "open_canvas",
          canvas: {
            title: "What I need from you",
            kind: "checklist",
            markdown: "## What I need from you\n- [ ] Pick one option\n- [ ] Confirm the first area to focus on",
          },
        },
      },
    ],
    context_cards: [],
    data_used: [],
    confidence: { level: "medium", rationale: "Missing detail prevents deterministic selection." },
    signal_strength: { level: "low", score: 20, rationale: "Clarification required before tool execution." },
    provenance: { used_fact_ids: [] },
  };
};

const applyPreferencesToText = (text: string, preferences: NonNullable<TomContext["preferences"]>) => {
  if (!text) return text;
  let out = text;
  if (preferences.tone === "formal") {
    out = out.replace(/\bHi\b[,.! ]*/gi, "Hello ");
    out = out.replace(/\bHello there\b/gi, "Hello");
    out = out.replace(/\bWelcome back\b/gi, "Welcome");
  }
  if (preferences.verbosity === "short") {
    const short = out.split(/[.!?]/).map((s) => s.trim()).filter(Boolean)[0];
    if (short) out = `${short}.`;
  }
  return out.trim();
};

const applyPreferencesToRichResponse = (rich: RichResponse, preferences: NonNullable<TomContext["preferences"]>): RichResponse => {
  let next = { ...rich };
  next.summary = applyPreferencesToText(next.summary, preferences);
  if (next.voice_summary) next.voice_summary = applyPreferencesToText(next.voice_summary, preferences);

  if (preferences.format === "bullets") {
    next.sections = next.sections.map((section) => {
      if (section.bullets.length > 0) return section;
      const bullets = section.body
        .split(/[.;]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 3);
      return { ...section, bullets };
    });
  }

  if (preferences.verbosity === "short") {
    next.sections = next.sections.slice(0, 1).map((section) => ({
      ...section,
      bullets: section.bullets.slice(0, 3),
    }));
  }

  if (preferences.verbosity === "detailed") {
    next.sections = next.sections.map((section) => ({
      ...section,
      bullets: section.bullets.slice(0, 6),
    }));
  }

  return next;
};

const buildVoiceContext = (params: {
  trace_id: string;
  intent: string;
  routing_path: string;
  preferences?: TomContext["preferences"];
  page_label?: string;
}): VoiceContext => ({
  tone: params.preferences?.tone ?? "friendly",
  verbosity: params.preferences?.verbosity ?? "normal",
  routing_path: params.routing_path,
  intent: params.intent,
  trace_id: params.trace_id,
  page_label: params.page_label,
});

const applyPatternToRichResponse = (params: {
  rich: RichResponse;
  trace_id: string;
  intent: string;
  routing_path: string;
  preferences?: TomContext["preferences"];
  question?: string;
}): RichResponse => {
  const patternResult = applyConversationPattern({
    ctx: {
      intent: params.intent,
      routing_path: params.routing_path,
      tone: params.preferences?.tone ?? "friendly",
      verbosity: params.preferences?.verbosity ?? "normal",
      trace_id: params.trace_id,
    },
    title: params.rich.title,
    summary: params.rich.summary,
    bullets: params.rich.sections[0]?.bullets,
    question: params.question,
    next_actions: params.rich.next_actions,
  });

  let next: RichResponse = {
    ...params.rich,
    summary: patternResult.summary,
    voice_summary: patternResult.summary,
    next_actions: patternResult.next_actions as RichResponse["next_actions"] ?? params.rich.next_actions,
  };

  if (patternResult.bullets && next.sections.length > 0) {
    next = {
      ...next,
      sections: next.sections.map((section, idx) => (
        idx === 0 ? { ...section, bullets: patternResult.bullets as string[] } : section
      )),
    };
  }

  return sanitizeRichForReturn(next);
};

const sanitizeRichForReturn = (rich: RichResponse): RichResponse => {
  const sectionBulletCounts = rich.sections.map((section) => section.bullets.length);
  const flattenedBullets = rich.sections.flatMap((section) => section.bullets);
  const sanitized = sanitizeRichResponse({
    title: rich.title,
    summary: rich.summary,
    bullets: flattenedBullets,
  });
  let cursor = 0;
  const rebuiltSections = rich.sections.map((section, idx) => {
    const count = sectionBulletCounts[idx];
    const slice = sanitized.bullets.slice(cursor, cursor + count);
    cursor += count;
    return { ...section, bullets: slice };
  });
  return {
    ...rich,
    title: sanitized.title || rich.title,
    summary: sanitized.summary || rich.summary,
    voice_summary: sanitized.summary || rich.voice_summary || rich.summary,
    sections: rebuiltSections,
  };
};

const buildEmotionResetResponse = (params: {
  traceId: string;
  preferences?: TomContext["preferences"];
  explicitReset?: boolean;
}): RichResponse => {
  const question = pickVariant(`${params.traceId}:emotion_misc:question`, [
    "What were you trying to get to?",
    "What do you want to look at next?",
    "What outcome are you aiming for right now?",
  ]);
  const summary = params.explicitReset
    ? pickVariant(`${params.traceId}:emotion_misc:summary:reset`, [
      "Understood. Starting fresh from here.",
      "We can start cleanly from this point.",
      "Resetting now. We can choose one clear direction next.",
    ])
    : pickVariant(`${params.traceId}:emotion_misc:summary`, [
      "Sounds like something is off. I can help get this back on track quickly.",
      "Understood. We can steer this to the right place.",
      "Got it. We can move forward in one step.",
    ]);
  const clean = enforceSingleQuestionText({
    title: params.explicitReset ? "Starting over" : "Understood",
    summary: dedupeLines(`${summary}\n${summary}`),
    bullets: [
      "Open Operations for live metrics.",
      "Open Planning for sessions and workload.",
        "Show a useful snapshot right now.",
    ],
    question,
  });

  const richBase: RichResponse = {
    title: clean.title,
    summary: clean.summary,
    voice_summary: clean.summary,
    sections: [
      {
        heading: "Next best step",
        body: "Choose the next area and I will move us there immediately.",
        bullets: clean.bullets,
      },
    ],
    tables: [],
    next_actions: [
      {
        label: "Operations",
        rationale: "Open Operations overview.",
        action_type: "ask",
        payload: { type: "clarify", kind: "domain_priority", choice: "Operations" },
      },
      {
        label: "Planning",
        rationale: "Open Planning overview.",
        action_type: "ask",
        payload: { type: "clarify", kind: "domain_priority", choice: "Planning" },
      },
      {
        label: "Show something useful",
        rationale: "Start with a practical sample.",
        action_type: "ask",
        payload: { type: "clarify", kind: "missing_required_tool", choice: "Show something useful" },
      },
    ],
    context_cards: [],
    data_used: [],
    confidence: { level: "medium", rationale: "Deterministic conversational handling without tools." },
    signal_strength: { level: "low", score: 5, rationale: "No external data required." },
  };
  return applyPreferencesToRichResponse(richBase, params.preferences ?? {});
};

const isExplicitResetRequest = (message: string) =>
  /\b(reset|start over|clear|forget|wipe|new thread)\b/i.test(message);

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ChatRequest;
  const clarifyChoicePrompt = body.action?.type === "clarify" ? (body.action.choice || "") : "";
  const prompt = (clarifyChoicePrompt || body.prompt || "").trim();

  // ── Knowledge layer dispatch ───────────────────────────────────────────────
  // Runs on every request. Classifies the prompt against /knowledge/ JSON files.
  // Result is attached to the trace for full auditability.
  // Never throws — errors return an unmatched result.
  const knowledgeDispatch = dispatchKnowledge(prompt);
  // ──────────────────────────────────────────────────────────────────────────

  let reasoningAssistCalled = false;
  const llmPlannerEnabled = process.env.TOM_LLM_PLANNER === "true";
  let llmPlannerUsed = false;
  let llmPlannerConfidence: number | undefined;
  let llmPlannerIntent: string | undefined;
  let llmPlannerDecision: PlannerDecision | null = null;

  if (!prompt) {
    const trace = createTraceBase({
      user_message: "",
      intent: classifyIntent(""),
      intent_confidence: 0.2,
    });
    trace.route.routing_path = "normal";
    trace.outcome = { status: "blocked", notes: "empty_prompt" };
    trace.constraints.push(`llm_planner_used:${llmPlannerUsed ? "true" : "false"}`);
    trace.constraints.push(`reasoning_assist_used:${reasoningAssistCalled ? "true" : "false"}`);
    await persistTrace(trace);
    return NextResponse.json(
      { response: "Please enter a request.", sources: [], topic: null, trace_id: trace.trace_id, debug_routing_path: trace.route.routing_path,
        debug_reasoning_assist: reasoningAssistCalled,
        debug_reasoning_assist_used: reasoningAssistCalled,
        debug_llm_planner_enabled: llmPlannerEnabled,
        debug_llm_planner_used: llmPlannerUsed,
        debug_llm_planner_confidence: llmPlannerConfidence,
        debug_llm_planner_intent: llmPlannerIntent,
        debug_domain: "general",
        debug_last_snapshot_available: false,
        debug_llm_used: false,
        allowed_facts: { count: 0 }, provenance: { used_fact_ids: [] }, trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome } } satisfies ChatResponse,
      { status: 400 },
    );
  }

  if (!connectorRegistry.isInitialized) {
    await initializeIntegrations();
  }

  const cookieSession = request.cookies.get("tom_session")?.value;
  const sessionId = getSessionId(cookieSession);
  let ctx = getContext(sessionId);

  const statuses = await connectorRegistry.getAllStatuses();
  const connected = Object.entries(statuses).filter(([, s]) => s.connected).map(([k]) => k.toUpperCase());
  const missing = Object.entries(statuses).filter(([, s]) => !s.connected).map(([k]) => k.toUpperCase());
  const extractedPreferences = extractPreferences(prompt);
  const preferencesPatch = Object.keys(extractedPreferences).length > 0
    ? { preferences: { ...(ctx.preferences ?? {}), ...extractedPreferences } }
    : {};
  ctx = updateContext(sessionId, { connectedSources: connected, missingSources: missing, ...preferencesPatch });
  const rememberRoutingPath = (routing_path?: string) => {
    if (!routing_path) return;
    ctx = updateContext(sessionId, { last_routing_path: routing_path });
  };
  let debugStage: ReasoningStage | undefined;
  const promptDomain = detectDomain(prompt);
  const debugBase = (params?: { llmUsed?: boolean; stage?: ReasoningStage }) => ({
    debug_reasoning_assist: reasoningAssistCalled,
    debug_reasoning_assist_used: reasoningAssistCalled,
    debug_llm_planner_enabled: llmPlannerEnabled,
    debug_llm_planner_used: llmPlannerUsed,
    debug_llm_planner_confidence: llmPlannerConfidence,
    debug_llm_planner_intent: llmPlannerIntent,
    debug_domain: promptDomain,
    debug_last_snapshot_available: Boolean(ctx.last_snapshot),
    debug_llm_used: params?.llmUsed ?? false,
    debug_stage: params?.stage ?? debugStage,
  });
  const plannerRequest: PlannerRequest = {
    message: prompt,
    last_routing_path: ctx.last_routing_path,
    pending_clarification: ctx.pending_clarification,
    pending_approval: ctx.pending_approval,
    page_context: ctx.page_context,
    available_sections: ["operations", "logistics", "planning", "collaboration", "intelligence", "settings", "chat"],
    available_views: VIEW_REGISTRY.map((view) => ({
      id: view.id,
      label: view.label,
      section: view.section,
      implemented: view.implemented,
    })),
  };
  llmPlannerDecision = await planWithLLM(plannerRequest);
  llmPlannerUsed = Boolean(llmPlannerDecision);
  llmPlannerIntent = llmPlannerDecision?.intent;
  llmPlannerConfidence = llmPlannerDecision?.confidence;
  const plannerGate = gatePlannerDecision({
    decision: llmPlannerDecision,
    message: prompt,
    toolContracts: TOOL_CONTRACTS,
    viewRegistry: VIEW_REGISTRY,
    pending_approval: ctx.pending_approval,
    pending_clarification: ctx.pending_clarification,
  });
  const persistTraceWithAssist = async (trace: ReasoningTrace) => {
    trace.constraints = (trace.constraints || []).filter((item) => !item.startsWith("llm_planner:"));
    trace.constraints = (trace.constraints || []).filter((item) => !item.startsWith("llm_planner_model:"));
    trace.constraints = (trace.constraints || []).filter((item) => !item.startsWith("llm_planner_used:"));
    trace.constraints = (trace.constraints || []).filter((item) => !item.startsWith("llm_planner_intent:"));
    trace.constraints = (trace.constraints || []).filter((item) => !item.startsWith("llm_planner_confidence:"));
    if (llmPlannerUsed && llmPlannerDecision) {
      trace.constraints.push("llm_planner:true");
      trace.constraints.push(`llm_planner_model:${process.env.TOM_LLM_PLANNER_MODEL || process.env.TOM_LLM_MODEL || "gpt-4o"}`);
      trace.constraints.push(`llm_planner_intent:${llmPlannerDecision.intent}`);
      trace.constraints.push(`llm_planner_confidence:${llmPlannerDecision.confidence.toFixed(2)}`);
    }
    trace.constraints.push(`llm_planner_used:${llmPlannerUsed ? "true" : "false"}`);
    trace.constraints = (trace.constraints || []).filter((item) => !item.startsWith("reasoning_assist_used:"));
    trace.constraints.push(`reasoning_assist_used:${reasoningAssistCalled ? "true" : "false"}`);
    // Knowledge layer audit — always logged so you can answer "why did TOM respond like this?"
    trace.constraints.push(`knowledge_matched:${knowledgeDispatch.matched}`);
    if (knowledgeDispatch.matched) {
      trace.constraints.push(`knowledge_trigger:${knowledgeDispatch.trigger_id}`);
      trace.constraints.push(`knowledge_intent:${knowledgeDispatch.intent}`);
      trace.constraints.push(`knowledge_domain:${knowledgeDispatch.domain}`);
      trace.constraints.push(`knowledge_confidence:${knowledgeDispatch.confidence.toFixed(2)}`);
      trace.constraints.push(`knowledge_pack:${knowledgeDispatch.knowledge_pack_version}`);
      if (knowledgeDispatch.signals.length > 0) {
        trace.constraints.push(`knowledge_signals:${knowledgeDispatch.signals.slice(0, 5).join("|")}`);
      }
    }
    await persistTrace(trace);
  };
  const maybeApplyReasoningAssist = async (params: {
    trace: ReasoningTrace;
    routing_path?: string;
    rich: RichResponse;
    usedFactIdsCount?: number;
  }) => {
    const routingPath = params.routing_path ?? params.trace.route.routing_path;
    const skipReason = getReasoningAssistSkipReason({ routingPath });
    params.trace.constraints = (params.trace.constraints || []).filter((item) => !item.startsWith("reasoning_assist_skip:"));
    if (skipReason) {
      params.trace.constraints.push(`reasoning_assist_skip:${skipReason}`);
      return params.rich;
    }
    if (!shouldUseReasoningAssist({ routingPath })) return params.rich;
    const assist = await reasoningAssistRewrite({
      message: prompt,
      intent: params.trace.intent,
      routing_path: routingPath || "normal",
      page_context: ctx.page_context ?? null,
      data_used: params.rich.data_used ?? [],
      base: {
        title: params.rich.title,
        summary: params.rich.summary,
        bullets: params.rich.sections[0]?.bullets ?? [],
        question: undefined,
      },
    });
    if (!assist) return params.rich;
    reasoningAssistCalled = true;
    params.trace.constraints.push("reasoning_assist:true");
    params.trace.constraints.push(`reasoning_assist_model:${process.env.TOM_LLM_MODEL || "gpt-4o"}`);
    const firstSectionBullets = assist.bullets && assist.bullets.length > 0
      ? assist.bullets
      : params.rich.sections[0]?.bullets ?? [];
    return {
      ...params.rich,
      title: assist.title || params.rich.title,
      summary: assist.summary || params.rich.summary,
      voice_summary: assist.voice_summary || assist.summary || params.rich.voice_summary || params.rich.summary,
      sections: params.rich.sections.map((sectionItem, idx) =>
        idx === 0 ? { ...sectionItem, bullets: firstSectionBullets } : sectionItem
      ),
    } satisfies RichResponse;
  };

  const confirmId = parseConfirmAction(prompt);
  const explicitApprovalChoice = body.action?.type === "approve"
    ? normalizeApprovalChoice(body.action.choice || "")
    : "unknown";

  if (ctx.pending_approval) {
    const pendingApproval = ctx.pending_approval;
    const pendingUserSummary = pendingApproval.user_summary || buildApprovalUserSummary(pendingApproval.action);
    const pendingPreview = pendingApproval.preview || buildApprovalPreview(pendingApproval.action);
    const pendingDryRun = pendingApproval.dry_run ?? true;
    let approvalDecision = explicitApprovalChoice;
    if (approvalDecision === "unknown") {
      approvalDecision = normalizeApprovalChoice(prompt);
    }
    if (approvalDecision === "unknown" && confirmId && ctx.pendingActions.length > 0) {
      const pending = ctx.pendingActions.find((action) => action.action_id === confirmId);
      approvalDecision = normalizeApprovalChoice(String(pending?.payload?.choice || ""));
    }
    if (approvalDecision === "approve" || approvalDecision === "deny") {
      const trace = createTraceBase({
        user_message: prompt,
        intent: classifyIntent(prompt),
        intent_confidence: 0.7,
      });
      trace.route = { mode: "deterministic", reason: "Approval decision flow", routing_path: "approval_gate" };
      trace.governance = {
        approval: {
          requested: true,
          risk: pendingApproval.risk,
          reason: pendingApproval.reason,
          action_type: pendingApproval.action.type,
          approved: approvalDecision === "approve",
          executed: approvalDecision === "approve",
          outcome: approvalDecision === "approve" ? "action_dry_run" : "approval_denied",
        },
      };

      if (approvalDecision === "approve") {
        await logAudit({
          userId: "user",
          actionType: "approval_granted",
          toolsCalled: [pendingApproval.action.type],
          recordsAccessed: [],
          outcome: `trace:${trace.trace_id}`,
          correlationId: sessionId,
        });
        await logAudit({
          userId: "user",
          actionType: "action_dry_run",
          toolsCalled: [pendingApproval.action.type],
          recordsAccessed: [],
          outcome: `trace:${trace.trace_id}`,
          correlationId: sessionId,
        });
        trace.outcome = { status: "ok", notes: "approval_granted,action_dry_run" };
      } else {
        await logAudit({
          userId: "user",
          actionType: "approval_denied",
          toolsCalled: [pendingApproval.action.type],
          recordsAccessed: [],
          outcome: `trace:${trace.trace_id}`,
          correlationId: sessionId,
        });
        trace.outcome = { status: "ok", notes: "approval_denied" };
      }

      const rich: RichResponse = {
        title: approvalDecision === "approve" ? "Action approved" : "Action cancelled",
        summary: approvalDecision === "approve"
          ? "Approval received. I logged a dry-run execution for this action."
          : "Understood. I cancelled this action and made no changes.",
        voice_summary: approvalDecision === "approve"
          ? "Approval received. I logged a dry-run execution for this action."
          : "Understood. I cancelled this action and made no changes.",
        sections: [
          {
            heading: "Governance",
            body: `Risk: ${pendingApproval.risk}. Reason: ${pendingApproval.reason}.`,
            bullets: [approvalDecision === "approve" ? "Execution mode: dry run" : "No execution performed"],
          },
        ],
        tables: [],
        next_actions: [],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Explicit approval decision recorded." },
        signal_strength: { level: "medium", score: 40, rationale: "Governance decision captured." },
      };
      updateContext(sessionId, { pending_approval: undefined, pendingActions: [] });
      await persistTraceWithAssist(trace);
      const patterned = applyPatternToRichResponse({
        rich,
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: trace.route.routing_path ?? "approval_gate",
        preferences: ctx.preferences,
      });
      const response = NextResponse.json(
        { response: patterned.summary, rich: patterned, sources: [], topic: "approval", trace_id: trace.trace_id, debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }), allowed_facts: { count: 0 }, provenance: { used_fact_ids: [] }, trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome } } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }

    const approvalHelpRequested = shouldRouteApprovalHelp({ hasPendingApproval: true, message: prompt }) || isApprovalHelpQuery(prompt) || classifyIntent(prompt) === "approval_help";
    if (approvalHelpRequested) {
      const trace = createTraceBase({
        user_message: prompt,
        intent: "approval_help",
        intent_confidence: 0.9,
      });
      trace.route = { mode: "deterministic", reason: "Approval help requested while pending approval exists", routing_path: "approval_help" };
      trace.plan.steps = [{ id: "1", kind: "respond", name: "approval_help_response" }];
      trace.verification = { required: false, rules: [] };
      trace.outcome = { status: "ok", notes: "approval_help_handled" };
      trace.governance = {
        approval: {
          requested: true,
          risk: pendingApproval.risk,
          reason: pendingApproval.reason,
          action_type: pendingApproval.action.type,
          approved: false,
          executed: false,
          outcome: "approval_help",
        },
      };
      const changes = (pendingPreview.changes ?? []).slice(0, 5);
      const previewBullets = [
        `Target: ${pendingPreview.target ?? "unknown"}`,
        ...changes.map((change) => `${change.field} -> ${String(change.to ?? "not available")}`),
        `Reversible: ${typeof pendingPreview.reversible === "boolean" ? (pendingPreview.reversible ? "yes" : "no") : "unknown"}`,
      ];
      const actions = Array.isArray(ctx.pendingActions) && ctx.pendingActions.length > 0 ? ctx.pendingActions : buildApprovalActions();
      if (actions !== ctx.pendingActions) {
        updateContext(sessionId, { pendingActions: actions as any });
      }
      const dryRunNote = pendingDryRun ? " (dry run: no changes will be applied)" : "";
      const richBase: RichResponse = {
        title: "Confirm before I proceed",
        summary: `You are about to: ${pendingUserSummary}${dryRunNote}.`,
        voice_summary: `You are about to: ${pendingUserSummary}${dryRunNote}.`,
        sections: [
          {
            heading: "What will change",
            body: pendingApproval.reason,
            bullets: previewBullets,
          },
          {
            heading: "What happens next",
            body: "Choose approve or cancel.",
            bullets: ["Approve: I will apply the change.", "Cancel: Nothing changes."],
          },
        ],
        tables: [],
        next_actions: actions as any,
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Pending approval details are available in context." },
        signal_strength: { level: "low", score: 10, rationale: "No external data needed." },
      };
      const rich = applyPatternToRichResponse({
        rich: applyPreferencesToRichResponse(richBase, ctx.preferences ?? {}),
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: "approval_help",
        preferences: ctx.preferences,
      });
      await persistTraceWithAssist(trace);
      const response = NextResponse.json(
        {
          response: rich.summary,
          rich,
          sources: [],
          topic: trace.intent,
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }

    {
      const trace = createTraceBase({
        user_message: prompt,
        intent: "approval_help",
        intent_confidence: 0.7,
      });
      trace.route = { mode: "deterministic", reason: "Pending approval in progress", routing_path: "approval_help" };
      trace.plan.steps = [{ id: "1", kind: "respond", name: "approval_pending_reminder" }];
      trace.verification = { required: false, rules: [] };
      trace.outcome = { status: "ok", notes: "approval_pending_reminder" };
      const actions = Array.isArray(ctx.pendingActions) && ctx.pendingActions.length > 0 ? ctx.pendingActions : buildApprovalActions();
      if (actions !== ctx.pendingActions) {
        updateContext(sessionId, { pendingActions: actions as any });
      }
      const dryRunNote = pendingDryRun ? " (dry run: no changes will be applied)" : "";
      const richBase: RichResponse = {
        title: "Confirm before I proceed",
        summary: `You are about to: ${pendingUserSummary}${dryRunNote}.`,
        voice_summary: `You are about to: ${pendingUserSummary}${dryRunNote}.`,
        sections: [
          {
            heading: "What happens next",
            body: "Choose approve or cancel.",
            bullets: ["Approve: I will apply the change.", "Cancel: Nothing changes."],
          },
        ],
        tables: [],
        next_actions: actions as any,
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Pending approval decision required." },
        signal_strength: { level: "low", score: 10, rationale: "No external data needed." },
      };
      const rich = applyPatternToRichResponse({
        rich: applyPreferencesToRichResponse(richBase, ctx.preferences ?? {}),
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: "approval_help",
        preferences: ctx.preferences,
      });
      await persistTraceWithAssist(trace);
      const response = NextResponse.json(
        {
          response: rich.summary,
          rich,
          sources: [],
          topic: trace.intent,
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }
  }

  if (confirmId && ctx.pendingActions.length > 0) {
    const pending = ctx.pendingActions.find((action) => action.action_id === confirmId);
    if (pending) {
      const result = await executeAction(pending, "user");
      const trace = createTraceBase({
        user_message: prompt,
        intent: classifyIntent(prompt),
        intent_confidence: 0.5,
      });
      trace.route.routing_path = "normal";
      trace.outcome = { status: "ok" };
      await logAudit({
        userId: "user",
        actionType: pending.action_type,
        toolsCalled: [pending.action_type],
        recordsAccessed: [],
        outcome: result.outcome,
        correlationId: confirmId,
      });
      const rich: RichResponse = {
        title: "Action executed",
        summary: result.outcome,
        voice_summary: result.outcome,
        sections: [],
        tables: result.link
          ? [
              {
                title: "Result",
                columns: ["Action", "Link"],
                rows: [[pending.label, result.link]],
                row_links: [result.link],
              },
            ]
          : [],
        next_actions: [],
        context_cards: [],
        data_used: [{ source: "TOM", label: "Action", value: pending.label }],
        confidence: { level: "high", rationale: "User confirmed action." },
        signal_strength: { level: "high", score: 80, rationale: "Direct user confirmation." },
      };
      await persistTraceWithAssist(trace);
      updateContext(sessionId, { pendingActions: [] });
      const patterned = applyPatternToRichResponse({
        rich,
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: trace.route.routing_path ?? "normal",
        preferences: ctx.preferences,
      });
      const response = NextResponse.json(
        { response: patterned.summary, rich: patterned, sources: [], topic: "action", trace_id: trace.trace_id, debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }), allowed_facts: { count: 0 }, provenance: { used_fact_ids: [] }, trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome } } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }
  }

  if (ctx.last_routing_path === "typo_oops" && (prompt === "ignore_last" || prompt === "use_last")) {
    const ignored = prompt === "ignore_last";
    ctx = updateContext(sessionId, { last_message_ignored: ignored });
    const trace = createTraceBase({
      user_message: prompt,
      intent: "typo_oops",
      intent_confidence: 0.95,
    });
    trace.route = { mode: "deterministic", reason: "Typo choice confirmation", routing_path: "typo_oops" };
    trace.goal = "Acknowledge ignore/use choice";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "typo_choice_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: ignored ? "last_message_ignored:true" : "last_message_ignored:false" };
    const rich = sanitizeRichForReturn({
      title: ignored ? "Ignored" : "Keeping it",
      summary: ignored
        ? "No worries - I will ignore that previous message."
        : "Understood - I will use your previous message.",
      voice_summary: ignored
        ? "No worries - I will ignore that previous message."
        : "Understood - I will use your previous message.",
      sections: [],
      tables: [],
      next_actions: [],
      context_cards: [],
      data_used: [],
      confidence: { level: "high", rationale: "Direct user choice." },
      signal_strength: { level: "low", score: 5, rationale: "No tools required." },
    });
    await persistTraceWithAssist(trace);
    rememberRoutingPath("typo_oops");
    const response = NextResponse.json({
      response: rich.summary,
      rich,
      sources: [],
      topic: trace.intent,
      trace_id: trace.trace_id,
      debug_routing_path: trace.route.routing_path,
      ...debugBase({ llmUsed: false }),
      allowed_facts: { count: 0 },
      provenance: { used_fact_ids: [] },
      trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
    } satisfies ChatResponse);
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  let earlyIntent = plannerGate.fallback_to_deterministic ? classifyIntent(prompt) : plannerGate.final_intent;
  if (
    promptDomain === "general" &&
    earlyIntent !== "greeting" &&
    earlyIntent !== "presence_ping" &&
    earlyIntent !== "ui_command" &&
    earlyIntent !== "typo_oops" &&
    earlyIntent !== "repetition_complaint" &&
    earlyIntent !== "meta_feedback" &&
    earlyIntent !== "approval_help" &&
    earlyIntent !== "locate" &&
    earlyIntent !== "operational_query" &&
    earlyIntent !== "governance_query" &&
    earlyIntent !== "staffing" &&
    earlyIntent !== "section_overview"
  ) {
    earlyIntent = "conversational_misc";
  }
  const uiCommand = parseUiCommand(prompt);
  const explainTrigger = isExplainRequest(prompt);
  const explicitRefresh = /\b(refresh|latest|recheck|rerun|re-run)\b/i.test(prompt);
  if (explainTrigger && ctx.last_answer_context && !explicitRefresh) {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "operational_query",
      intent_confidence: 0.88,
    });
    trace.route = { mode: "deterministic", reason: "Expand on demand from last answer context", routing_path: "expanded_explanation" };
    trace.plan.steps = [{ id: "1", kind: "respond", name: "expanded_explanation_response" }];
    trace.verification = { required: true, rules: ["evidence_required"] };
    trace.constraints.push("explain_mode:expanded");
    trace.constraints.push("explain_trigger:true");

    const lastCtx = ctx.last_answer_context;
    const pageType = (() => {
      const pageId = lastCtx.page_ids?.[0] || "";
      if (pageId.includes("ptl")) return "ptl" as const;
      if (pageId.includes("rtt")) return "rtt" as const;
      if (pageId.includes("cancer")) return "cancer_2ww" as const;
      if (pageId.includes("referral")) return "referrals" as const;
      if (pageId.includes("triage")) return "triage" as const;
      if (pageId.includes("breach")) return "breach_tracking" as const;
      if (pageId.includes("milestone")) return "pathway_milestones" as const;
      if (pageId.includes("clock")) return "clock_events" as const;
      if (pageId.includes("validation")) return "data_quality" as const;
      return "waiting_list" as const;
    })();
    const pageLabels = (lastCtx.page_ids || []).map((id) => VIEW_REGISTRY.find((view) => view.id === id)?.label || id);
    const expanded = buildExplanation({
      mode: "expanded",
      page_type: pageType,
      finding_type: lastCtx.finding_type || "summary",
      finding_data: {
        finding_summary: lastCtx.finding_summary,
      },
      evidence_summary: "From the previous verified answer context.",
      page_labels: pageLabels,
    });
    const expandedViewId = ACCESS_PATHWAYS_VIEW_ID_BY_PAGE_TYPE[pageType];
    const expandedStage = resolveLifecycleStage(expandedViewId);
    const expandedSummary = [
      ensureSentence(lifecycleContextForStage(expandedStage)),
      ensureSentence(stripCheckedLine(expanded.summary)),
      buildAccessPathwaysCheckedLine(pageType),
    ].join(" ");
    trace.constraints.push(`lifecycle_stage:${expandedStage}`);
    trace.constraints.push("lifecycle_context_applied:true");
    trace.constraints.push("cross_page_checked:false");
    const richBase: RichResponse = {
      title: expanded.title || "Explanation",
      summary: expandedSummary,
      voice_summary: expandedSummary,
      sections: [
        {
          heading: "Breakdown",
          body: "Expanded explanation from the prior verified result.",
          bullets: expanded.bullets ?? [],
          used_fact_ids: lastCtx.used_fact_ids ?? [],
        },
      ],
      tables: [],
      next_actions: ([
        {
          label: "Refresh",
          rationale: "Re-run the same page check for latest values.",
          action_type: "ask" as const,
          payload: { type: "clarify", kind: "missing_required_tool", choice: "refresh" },
        },
        {
          label: "Open checked page",
          rationale: "Inspect the same source page directly.",
          action_type: "open" as const,
          payload: { type: "open_view", deeplink: viewIdToDeeplink(lastCtx.page_ids?.[0] || ""), label: "Open page" },
        },
      ] as RichNextAction[]).filter((action) => action.action_type !== "open" || String(action.payload?.deeplink || "").length > 0),
      context_cards: [],
      data_used: (lastCtx.page_ids || []).map((id) => ({ source: `view.read:${id}` })),
      confidence: { level: "high", rationale: "Explanation generated from stored verified context." },
      signal_strength: { level: "medium", score: 40, rationale: "No new tool run; reused prior evidence context." },
      provenance: { used_fact_ids: lastCtx.used_fact_ids ?? [] },
    };
    trace.outcome = { status: "ok", notes: `expanded_from_last_context,used_fact_ids:${(lastCtx.used_fact_ids || []).length}` };
    await persistTraceWithAssist(trace);
    rememberRoutingPath("expanded_explanation");
    const response = NextResponse.json({
      response: richBase.summary,
      rich: sanitizeRichForReturn(richBase),
      sources: richBase.data_used.map((d) => d.source),
      topic: trace.intent,
      trace_id: trace.trace_id,
      debug_routing_path: trace.route.routing_path,
      ...debugBase({ llmUsed: false }),
      allowed_facts: { count: lastCtx.used_fact_ids?.length ?? 0 },
      provenance: { used_fact_ids: lastCtx.used_fact_ids ?? [] },
      trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
    } satisfies ChatResponse);
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }
  const emotionActionRoute = ctx.last_routing_path === "emotion_misc"
    ? resolveEmotionActionRoute(prompt)
    : null;
  const emotionLock =
    ctx.last_routing_path === "emotion_misc" &&
    (earlyIntent === "emotion_or_short_utterance" || earlyIntent === "meta_feedback");
  const antiFallbackIntent =
    earlyIntent === "ui_command" ||
    earlyIntent === "show_in_canvas" ||
    earlyIntent === "greeting" ||
    earlyIntent === "typo_oops" ||
    earlyIntent === "repetition_complaint" ||
    earlyIntent === "presence_ping" ||
    earlyIntent === "meta_feedback" ||
    earlyIntent === "emotion_or_short_utterance";
  if (earlyIntent === "ui_command") {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "ui_command",
      intent_confidence: 0.98,
    });
    trace.route = { mode: "deterministic", reason: "UI command override", routing_path: "ui_command" };
    trace.goal = "Execute UI orchestration command immediately";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "ui_command_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "ui_command_handled" };

    let rich: RichResponse;
    if (uiCommand.kind === "close_canvas") {
      rich = {
        title: "Workspace",
        summary: "Closing canvas now.",
        voice_summary: "Closing canvas now.",
        sections: [],
        tables: [],
        next_actions: [
          {
            label: "Close canvas",
            rationale: "Close the right-side workspace.",
            action_type: "open",
            payload: { type: "open_canvas", canvas: { title: "", markdown: "" } },
          },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Direct UI command." },
        signal_strength: { level: "low", score: 5, rationale: "No data access required." },
      };
    } else if (uiCommand.kind === "open_view" && uiCommand.section === "operations") {
      rich = {
        title: "Workspace",
        summary: "Opening Operations now.",
        voice_summary: "Opening Operations now.",
        sections: [],
        tables: [],
        next_actions: [
          {
            label: "Open Operations",
            rationale: "Navigate to Operations.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "Operations" },
          },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Direct UI command." },
        signal_strength: { level: "low", score: 5, rationale: "No data access required." },
      };
    } else if (uiCommand.kind === "open_view" && uiCommand.section === "planning") {
      rich = {
        title: "Workspace",
        summary: "Opening Planning now.",
        voice_summary: "Opening Planning now.",
        sections: [],
        tables: [],
        next_actions: [
          {
            label: "Open Planning",
            rationale: "Navigate to Planning.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=planning&view=sessions", label: "Planning" },
          },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Direct UI command." },
        signal_strength: { level: "low", score: 5, rationale: "No data access required." },
      };
    } else if (uiCommand.kind === "open_view" && uiCommand.section === "collaboration") {
      rich = {
        title: "Workspace",
        summary: "Opening the Forum now.",
        voice_summary: "Opening the Forum now.",
        sections: [],
        tables: [],
        next_actions: [
          {
            label: "Open Forum",
            rationale: "Navigate to Collaboration Forum.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=collaboration&view=forum", label: "Forum" },
          },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Direct UI command." },
        signal_strength: { level: "low", score: 5, rationale: "No data access required." },
      };
    } else if (uiCommand.kind === "open_canvas") {
      // If there's a recent snapshot, open that — otherwise ask what they want to see
      const existingSnapshot = ctx.last_snapshot;
      if (existingSnapshot && existingSnapshot.blocks && existingSnapshot.blocks.length > 0) {
        rich = {
          title: existingSnapshot.title || "Snapshot",
          summary: `Here's the latest snapshot — ${existingSnapshot.title || "your last result"}.`,
          voice_summary: `Here's your latest snapshot.`,
          sections: [],
          tables: [],
          next_actions: [
            {
              label: "Open snapshot",
              rationale: "Show the latest data snapshot in canvas.",
              action_type: "open",
              payload: {
                type: "open_canvas",
                canvas: {
                  title: existingSnapshot.title || "Snapshot",
                  markdown: "",
                  blocks: existingSnapshot.blocks,
                },
              },
            },
          ],
          context_cards: [],
          data_used: [],
          confidence: { level: "high", rationale: "Using stored session snapshot." },
          signal_strength: { level: "low", score: 5, rationale: "No data access required." },
        };
      } else {
        rich = {
          title: "Canvas",
          summary: "Canvas is open. Just tell me what to load — PTL, roster, RTT summary, theatre schedule, or anything else you need.",
          voice_summary: "Canvas is open. What shall I load up for you?",
          sections: [],
          tables: [],
          next_actions: [
            {
              label: "PTL snapshot",
              rationale: "Show the PTL in canvas.",
              action_type: "ask",
              payload: { type: "clarify", kind: "missing_required_tool", choice: "show me the PTL snapshot" },
            },
            {
              label: "Roster view",
              rationale: "Show the roster in canvas.",
              action_type: "ask",
              payload: { type: "clarify", kind: "missing_required_tool", choice: "show me the roster snapshot" },
            },
          ],
          context_cards: [],
          data_used: [],
          confidence: { level: "high", rationale: "Prompting for canvas content." },
          signal_strength: { level: "low", score: 5, rationale: "No data access required." },
        };
      }
    } else {
      rich = {
        title: "Workspace",
        summary: "Opening canvas now.",
        voice_summary: "Opening canvas now.",
        sections: [],
        tables: [],
        next_actions: [
          {
            label: "Open canvas",
            rationale: "Open a scratchpad workspace.",
            action_type: "open",
            payload: {
              type: "open_canvas",
              canvas: { title: "Workspace", markdown: buildScratchpadCanvasMarkdown() },
            },
          },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Direct UI command." },
        signal_strength: { level: "low", score: 5, rationale: "No data access required." },
      };
    }

    const patterned = applyPatternToRichResponse({
      rich: applyPreferencesToRichResponse(rich, ctx.preferences ?? {}),
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: "ui_command",
      preferences: ctx.preferences,
    });
    await persistTraceWithAssist(trace);
    rememberRoutingPath("ui_command");
    const response = NextResponse.json(
      {
        response: patterned.summary,
        rich: patterned,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }
  if (earlyIntent === "show_in_canvas") {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "show_in_canvas",
      intent_confidence: 0.96,
    });
    trace.route = { mode: "deterministic", reason: "Canvas snapshot command", routing_path: "canvas_snapshot" };
    trace.goal = "Open latest snapshot in canvas";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "canvas_snapshot_open" }];
    trace.verification = { required: false, rules: [] };
    trace.constraints.push(`domain:${promptDomain}`);

    let snapshot = ctx.last_snapshot;
    if (!snapshot && /\bptl\b/i.test(prompt)) {
      const ptlView = VIEW_REGISTRY.find((view) => view.id === "operations.ptl");
      if (ptlView?.implemented && ptlView.read) {
        const result = await ptlView.read({ filters: {} });
        const table = coerceTableFromViewData(result.data);
        if (table) {
          snapshot = {
            title: "PTL snapshot",
            blocks: [
              {
                type: "table",
                title: "PTL",
                heading: "PTL",
                body: "Current PTL snapshot.",
                bullets: [],
                table,
              },
            ],
            trace_id: trace.trace_id,
            updated_at: new Date().toISOString(),
          };
          ctx = updateContext(sessionId, { last_snapshot: snapshot });
        }
      }
    }

    if (!snapshot) {
      trace.outcome = { status: "fallback", notes: "canvas_snapshot_missing" };
      const fallbackRich = sanitizeRichForReturn({
        title: "Canvas",
        summary: "I do not have a recent snapshot to show yet. Ask for a PTL, roster, or threads snapshot first.",
        voice_summary: "I do not have a recent snapshot to show yet. Ask for a PTL, roster, or threads snapshot first.",
        sections: [],
        tables: [],
        next_actions: [
          {
            label: "PTL snapshot",
            rationale: "Create a PTL snapshot first.",
            action_type: "ask",
            payload: { type: "clarify", kind: "missing_required_tool", choice: "PTL snapshot" },
          },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "medium", rationale: "No stored snapshot available in context." },
        signal_strength: { level: "low", score: 5, rationale: "No data access required." },
      });
      await persistTraceWithAssist(trace);
      rememberRoutingPath("canvas_snapshot");
      const response = NextResponse.json({
        response: fallbackRich.summary,
        rich: fallbackRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse);
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }

    trace.constraints.push("canvas_opened:true");
    trace.outcome = { status: "ok", notes: "canvas_snapshot_opened" };
    const rich = sanitizeRichForReturn({
      title: snapshot.title || "Snapshot",
      summary: "Opening the latest snapshot in canvas.",
      voice_summary: "Opening the latest snapshot in canvas.",
      sections: [],
      tables: [],
      next_actions: [
        {
          label: "Open canvas",
          rationale: "Show the snapshot in workspace canvas.",
          action_type: "open",
          payload: {
            type: "open_canvas",
            canvas: {
              title: snapshot.title || "Snapshot",
              markdown: "",
              blocks: snapshot.blocks,
            },
          },
        },
      ],
      context_cards: [],
      data_used: [],
      confidence: { level: "high", rationale: "Using stored session snapshot." },
      signal_strength: { level: "low", score: 5, rationale: "No additional tools required." },
    });
    await persistTraceWithAssist(trace);
    rememberRoutingPath("canvas_snapshot");
    const response = NextResponse.json({
      response: rich.summary,
      rich,
      sources: [],
      topic: trace.intent,
      trace_id: trace.trace_id,
      debug_routing_path: trace.route.routing_path,
      ...debugBase({ llmUsed: false }),
      allowed_facts: { count: 0 },
      provenance: { used_fact_ids: [] },
      trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
    } satisfies ChatResponse);
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }
  if (earlyIntent === "greeting") {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "greeting",
      intent_confidence: 0.96,
    });
    trace.route = { mode: "deterministic", reason: "Greeting micro-intent", routing_path: "greeting" };
    trace.goal = "Acknowledge greeting and continue conversation";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "greeting_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "greeting_handled" };
    const continueAction = buildContinueActionFromTopic(ctx.last_topic);
    const nextActions: RichNextAction[] = [];
    if (continueAction) nextActions.push(continueAction);
    if (nextActions.length < 2) {
      nextActions.push({ label: "Operations", rationale: "Open Operations views.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "Operations" } });
    }
    if (nextActions.length < 2) {
      nextActions.push({ label: "Planning", rationale: "Open Planning views.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=planning&view=sessions", label: "Planning" } });
    }
    const summary = pickVariant(`${trace.trace_id}:greeting`, [
      "Hi there. What should I look at next?",
      "Hello. What do you want to do next?",
      "Good to see you. What should I check first?",
    ]);
    const rich = sanitizeRichForReturn({
      title: "Hi",
      summary,
      voice_summary: summary,
      sections: [],
      tables: [],
      next_actions: nextActions.slice(0, 2),
      context_cards: [],
      data_used: [],
      confidence: { level: "high", rationale: "Greeting intent matched directly." },
      signal_strength: { level: "low", score: 5, rationale: "No tools required." },
    });
    await persistTraceWithAssist(trace);
    rememberRoutingPath("greeting");
    const response = NextResponse.json({
      response: rich.summary,
      rich,
      sources: [],
      topic: trace.intent,
      trace_id: trace.trace_id,
      debug_routing_path: trace.route.routing_path,
      ...debugBase({ llmUsed: false }),
      allowed_facts: { count: 0 },
      provenance: { used_fact_ids: [] },
      trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
    } satisfies ChatResponse);
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }
  if (earlyIntent === "typo_oops") {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "typo_oops",
      intent_confidence: 0.97,
    });
    trace.route = { mode: "deterministic", reason: "Typo/oops micro-intent", routing_path: "typo_oops" };
    trace.goal = "Confirm whether previous message should be ignored";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "typo_oops_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "typo_oops_handled" };
    const rich = sanitizeRichForReturn({
      title: "No problem",
      summary: "No worries - want me to ignore that last message?",
      voice_summary: "No worries - want me to ignore that last message?",
      sections: [],
      tables: [],
      next_actions: [
        { label: "Yes, ignore it", rationale: "Ignore the previous message.", action_type: "ask", payload: { type: "clarify", choice: "ignore_last" } },
        { label: "No, use it", rationale: "Keep using the previous message.", action_type: "ask", payload: { type: "clarify", choice: "use_last" } },
      ],
      context_cards: [],
      data_used: [],
      confidence: { level: "high", rationale: "Typo/oops intent matched directly." },
      signal_strength: { level: "low", score: 5, rationale: "No tools required." },
    });
    await persistTraceWithAssist(trace);
    rememberRoutingPath("typo_oops");
    const response = NextResponse.json({
      response: rich.summary,
      rich,
      sources: [],
      topic: trace.intent,
      trace_id: trace.trace_id,
      debug_routing_path: trace.route.routing_path,
      ...debugBase({ llmUsed: false }),
      allowed_facts: { count: 0 },
      provenance: { used_fact_ids: [] },
      trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
    } satisfies ChatResponse);
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }
  if (earlyIntent === "repetition_complaint") {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "repetition_complaint",
      intent_confidence: 0.94,
    });
    trace.route = { mode: "deterministic", reason: "Repetition complaint micro-intent", routing_path: "repetition_complaint" };
    trace.goal = "Acknowledge repetition complaint and offer targeted options";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "repetition_complaint_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "repetition_complaint_handled" };
    const continueAction = buildContinueActionFromTopic(ctx.last_topic);
    const actions: RichNextAction[] = [];
    if (continueAction) actions.push(continueAction);
    actions.push(
      { label: "Open Operations", rationale: "Go straight to data pages.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "Operations" } },
      { label: "Open Canvas", rationale: "Switch to planning workspace.", action_type: "open", payload: { type: "open_canvas", canvas: { title: "Plan", markdown: "# Plan\n- [ ] Define goal\n- [ ] Choose next step" } } },
    );
    const rich = sanitizeRichForReturn({
      title: "Understood",
      summary: "You are right - I have been repetitive. Do you want data (pages), a plan (canvas), or a quick explanation?",
      voice_summary: "You are right - I have been repetitive. Do you want data, a plan, or a quick explanation?",
      sections: [
        {
          heading: "What changes now",
          body: "I will keep this tighter and move directly to your chosen path.",
          bullets: [
            "I will avoid repeating reset prompts.",
            "I will keep one targeted question at a time.",
          ],
        },
      ],
      tables: [],
      next_actions: actions.slice(0, 3),
      context_cards: [],
      data_used: [],
      confidence: { level: "high", rationale: "Direct complaint intent matched." },
      signal_strength: { level: "low", score: 10, rationale: "No tools required." },
    });
    await persistTraceWithAssist(trace);
    rememberRoutingPath("repetition_complaint");
    const response = NextResponse.json({
      response: rich.summary,
      rich,
      sources: [],
      topic: trace.intent,
      trace_id: trace.trace_id,
      debug_routing_path: trace.route.routing_path,
      ...debugBase({ llmUsed: false }),
      allowed_facts: { count: 0 },
      provenance: { used_fact_ids: [] },
      trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
    } satisfies ChatResponse);
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }
  if (earlyIntent === "presence_ping") {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "presence_ping",
      intent_confidence: 0.95,
    });
    trace.route = { mode: "deterministic", reason: "Presence ping", routing_path: "presence_ping" };
    trace.goal = "Confirm presence and offer deterministic next steps";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "presence_ping_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "presence_ping_handled" };
    const rich = applyPatternToRichResponse({
      rich: {
        title: "Yep - I am here.",
        summary: "Tell me what you want to do next, and I will move.",
        voice_summary: "Tell me what you want to do next, and I will move.",
        sections: [],
        tables: [],
        next_actions: [
          { label: "Operations", rationale: "Open Operations views.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "Operations" } },
          { label: "Planning", rationale: "Open Planning views.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=planning&view=sessions", label: "Planning" } },
          { label: "Show something useful", rationale: "Start with a practical sample.", action_type: "ask", payload: { type: "clarify", kind: "missing_required_tool", choice: "show me any data you have" } },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Direct presence confirmation." },
        signal_strength: { level: "low", score: 5, rationale: "No data access required." },
      },
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: "presence_ping",
      preferences: ctx.preferences,
    });
    const assisted = await maybeApplyReasoningAssist({
      trace,
      routing_path: "presence_ping",
      rich,
    });
    const finalRich = sanitizeRichForReturn(assisted);
    await persistTraceWithAssist(trace);
    rememberRoutingPath("presence_ping");
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: finalRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }
  if (earlyIntent === "meta_feedback") {
    if (emotionLock) {
      const trace = createTraceBase({
        user_message: prompt,
        intent: "emotion_or_short_utterance",
        intent_confidence: 0.85,
      });
      trace.route = { mode: "deterministic", reason: "Emotion lock from prior turn", routing_path: "emotion_misc" };
      trace.goal = "Maintain calm reset flow";
      trace.plan.steps = [{ id: "1", kind: "respond", name: "emotion_misc_response" }];
      trace.verification = { required: false, rules: [] };
      trace.outcome = { status: "ok", notes: "emotion_misc_lock" };
      const voiced = buildEmotionResetResponse({
        traceId: trace.trace_id,
        preferences: ctx.preferences,
        explicitReset: isExplicitResetRequest(prompt),
      });
      const rich = applyPatternToRichResponse({
        rich: voiced,
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: "emotion_misc",
        preferences: ctx.preferences,
      });
      const assisted = await maybeApplyReasoningAssist({
        trace,
        routing_path: "emotion_misc",
        rich,
      });
      const finalRich = sanitizeRichForReturn(assisted);
      await persistTraceWithAssist(trace);
      rememberRoutingPath("emotion_misc");
      const response = NextResponse.json(
        {
          response: finalRich.summary,
          rich: finalRich,
          sources: [],
          topic: trace.intent,
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }
    const trace = createTraceBase({
      user_message: prompt,
      intent: "meta_feedback",
      intent_confidence: 0.9,
    });
    trace.route = { mode: "deterministic", reason: "Meta feedback override", routing_path: "meta_feedback" };
    trace.goal = "Acknowledge feedback and adjust routing behavior deterministically";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "meta_feedback_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "meta_feedback_handled" };

    const rich: RichResponse = {
      title: "Got it.",
      summary: "Sounds like I missed what you meant. What were you expecting me to do - open a page, show data, or help plan?",
      voice_summary: "Sounds like I missed what you meant. What were you expecting me to do - open a page, show data, or help plan?",
      sections: [
        {
          heading: "What changes now",
          body: "I will steer from your intent directly and keep this practical.",
          bullets: [
            "No metric/timeframe loop for this complaint path.",
            "I can open a section, show data, or help plan next.",
          ],
        },
      ],
      tables: [],
      next_actions: [
        { label: "Open Operations", rationale: "Start from operations views.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "Operations" } },
        { label: "Open Planning", rationale: "Start from planning views.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=planning&view=sessions", label: "Planning" } },
        { label: "Show something useful", rationale: "Start with a practical sample.", action_type: "ask", payload: { type: "clarify", kind: "missing_required_tool", choice: "show me any data you have" } },
      ],
      context_cards: [],
      data_used: [],
      confidence: { level: "high", rationale: "Direct user feedback acknowledged." },
      signal_strength: { level: "low", score: 10, rationale: "No external data required." },
    };

    await persistTraceWithAssist(trace);
    const patterned = applyPatternToRichResponse({
      rich,
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "meta_feedback",
      preferences: ctx.preferences,
    });
    const assisted = await maybeApplyReasoningAssist({
      trace,
      routing_path: trace.route.routing_path,
      rich: patterned,
    });
    const finalRich = sanitizeRichForReturn(assisted);
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: finalRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    rememberRoutingPath(trace.route.routing_path);
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  if (earlyIntent === "emotion_or_short_utterance") {
    if (emotionLock) {
      const trace = createTraceBase({
        user_message: prompt,
        intent: "emotion_or_short_utterance",
        intent_confidence: 0.9,
      });
      trace.route = { mode: "deterministic", reason: "Emotion lock from prior turn", routing_path: "emotion_misc" };
      trace.goal = "Maintain calm reset flow";
      trace.plan.steps = [{ id: "1", kind: "respond", name: "emotion_misc_response" }];
      trace.verification = { required: false, rules: [] };
      trace.outcome = { status: "ok", notes: "emotion_misc_lock" };
      const voiced = buildEmotionResetResponse({
        traceId: trace.trace_id,
        preferences: ctx.preferences,
        explicitReset: isExplicitResetRequest(prompt),
      });
      const rich = applyPatternToRichResponse({
        rich: voiced,
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: "emotion_misc",
        preferences: ctx.preferences,
      });
      const assisted = await maybeApplyReasoningAssist({
        trace,
        routing_path: "emotion_misc",
        rich,
      });
      const finalRich = sanitizeRichForReturn(assisted);
      await persistTraceWithAssist(trace);
      rememberRoutingPath("emotion_misc");
      const response = NextResponse.json(
        {
          response: finalRich.summary,
          rich: finalRich,
          sources: [],
          topic: trace.intent,
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }
    const trace = createTraceBase({
      user_message: prompt,
      intent: "emotion_or_short_utterance",
      intent_confidence: 0.9,
    });
    trace.route = { mode: "deterministic", reason: "Short or emotional utterance", routing_path: "emotion_misc" };
    trace.goal = "Acknowledge tone and move user toward a productive next step";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "emotion_misc_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "emotion_misc_handled" };

    const withPreferences = buildEmotionResetResponse({
      traceId: trace.trace_id,
      preferences: ctx.preferences,
      explicitReset: isExplicitResetRequest(prompt),
    });
    const voiceContext = buildVoiceContext({
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "emotion_misc",
      preferences: ctx.preferences,
      page_label: ctx.page_context?.view,
    });
    const voiced = {
      ...withPreferences,
      summary: voiceSummary(voiceContext, withPreferences.summary),
      voice_summary: voiceSummary(voiceContext, withPreferences.voice_summary || withPreferences.summary),
    };
    const rich = applyPatternToRichResponse({
      rich: voiced,
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "emotion_misc",
      preferences: ctx.preferences,
      question: "What do you want to look at next?",
    });
    const assisted = await maybeApplyReasoningAssist({
      trace,
      routing_path: trace.route.routing_path ?? "emotion_misc",
      rich,
    });
    const finalRich = sanitizeRichForReturn(assisted);

    await persistTraceWithAssist(trace);
    rememberRoutingPath("emotion_misc");
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: finalRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  const forcedSectionFromEmotion = emotionActionRoute === "operations_overview"
    ? "operations"
    : emotionActionRoute === "planning_overview"
      ? "planning"
      : null;
  const snapshotSection = detectSnapshotSection(prompt);
  const sectionOverview = forcedSectionFromEmotion
    ? { section: forcedSectionFromEmotion, isOverview: true }
    : detectSectionOverview(prompt);
  if (sectionOverview.isOverview && !snapshotSection) {
    const section = sectionOverview.section ?? "operations";
    const overview = buildSectionOverview({ section, registry: VIEW_REGISTRY });

    const trace = createTraceBase({
      user_message: prompt,
      intent: "section_overview",
      intent_confidence: 0.92,
    });
    trace.route = { mode: "deterministic", reason: "Hard section overview guard", routing_path: "section_overview" };
    trace.goal = `Summarise available ${section} pages from view registry`;
    trace.plan.steps = [{ id: "1", kind: "respond", name: "section_overview_response" }];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "section_overview_handled" };

    const richBase: RichResponse = {
      title: overview.title,
      summary: overview.summary,
      voice_summary: overview.summary,
      sections: [
        {
          heading: "Available views",
          body: `I can walk through ${section} pages and open the one you want next.`,
          bullets: overview.bullets,
        },
      ],
      tables: [],
      next_actions: overview.actions,
      context_cards: [],
      data_used: [],
      confidence: { level: "high", rationale: "Generated directly from ViewRegistry." },
      signal_strength: { level: "medium", score: 50, rationale: "Registry coverage available." },
    };
    const withPreferences = applyPreferencesToRichResponse(richBase, ctx.preferences ?? {});
    const rich = applyPatternToRichResponse({
      rich: withPreferences,
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "section_overview",
      preferences: ctx.preferences,
    });
    const assisted = await maybeApplyReasoningAssist({
      trace,
      routing_path: trace.route.routing_path,
      rich,
    });
    const finalRich = sanitizeRichForReturn(assisted);
    await persistTraceWithAssist(trace);
    updateContext(sessionId, {
      last_topic: { kind: "section", id: section, label: overview.title, updated_at: new Date().toISOString() },
    });
    rememberRoutingPath("section_overview");
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: finalRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  if (isWaitingListExtremesQuery(prompt)) {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "operational_query",
      intent_confidence: 0.9,
    });
    trace.route = { mode: "deterministic", reason: "Waiting list extremes hard routing", routing_path: "ops_waiting_list_extremes" };
    trace.goal = "Identify the longest waiter from waiting list data";
    trace.plan.steps = [
      { id: "1", kind: "tool", name: "view.read", input: { view_ids: ["operations.access_pathways_waiting_list"] } },
      { id: "2", kind: "respond", name: "waiting_list_extremes_response" },
    ];
    trace.verification = { required: true, rules: ["evidence_required"] };
    trace.constraints.push("waiting_list_extremes:true");
    trace.constraints.push("pages_first:true");
    trace.constraints.push("explain_mode:concise");
    trace.constraints.push(`explain_trigger:${explainTrigger ? "true" : "false"}`);

    const firewall = await runTruthFirewall({
      prompt,
      intent: "operational_query",
      selectedTools: ["view.read"],
      selectedToolInputs: {
        "view.read": { view_ids: ["operations.access_pathways_waiting_list"] },
      },
      context: { connectedSources: connected, missingSources: missing },
    });
    const allowedFacts = buildAllowedFacts({ selectedTools: ["view.read"], evidence: firewall.evidence });
    trace.allowed_facts.ids = allowedFacts.ids;
    trace.constraints.push(`allowed_fact_count:${allowedFacts.ids.length}`);

    const waitingSource = "view.read:operations.access_pathways_waiting_list";
    const waitingEvidence = firewall.evidence.find((entry) => entry.source === waitingSource);
    const records = Array.isArray(waitingEvidence?.records)
      ? waitingEvidence.records.filter((record) => record && typeof record === "object")
      : [];
    const recordsWithWaitDays = records.filter((record: any) => typeof record.waiting_days === "number");
    const sortedByWait = [...recordsWithWaitDays].sort((a: any, b: any) => Number(b.waiting_days) - Number(a.waiting_days));
    const longest = sortedByWait[0] as any | undefined;

    let rich: RichResponse;
    if (longest && typeof longest.patient_name === "string") {
      const longestWait = Number(longest.waiting_days);
      const specialty = String(longest.specialty || "Unknown specialty");
      rich = {
        title: "Longest waiter",
        summary: `Longest waiter is ${longest.patient_name} in ${specialty}, waiting ${longestWait} days.`,
        voice_summary: `Longest waiter is ${longest.patient_name} in ${specialty}, waiting ${longestWait} days.`,
        sections: [
          {
            heading: "Waiting list extremes",
            body: "Derived from operations waiting list view data.",
            bullets: [
              `Patient: ${longest.patient_name}`,
              `Specialty: ${specialty}`,
              `Waiting days: ${longestWait}`,
            ],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Inspect full waiting list records.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          { source: waitingSource, label: "Patient", value: String(longest.patient_name) },
          { source: waitingSource, label: "Specialty", value: specialty },
          { source: waitingSource, label: "Waiting days", value: longestWait },
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
    } else {
      rich = {
        title: "Waiting list view loaded",
        summary: "I can open the waiting list page - it does not include wait length in the payload I receive.",
        voice_summary: "I can open the waiting list page - it does not include wait length in the payload I receive.",
        sections: [
          {
            heading: "Waiting list data",
            body: "The waiting list view is accessible but lacks wait-duration fields in this payload.",
            bullets: ["Open the waiting list page for direct review."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Review waiting list directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
    }

    const withPreferences = applyPreferencesToRichResponse(rich, ctx.preferences ?? {});
    const patterned = applyPatternToRichResponse({
      rich: withPreferences,
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "ops_waiting_list_extremes",
      preferences: ctx.preferences,
    });
    const usedFactCandidates = patterned.data_used.flatMap((entry) => allowedFacts.by_source[entry.source] ?? []);
    const usedFactIds = uniqueStableSubset(usedFactCandidates, allowedFacts.ids);
    const finalRich = sanitizeRichForReturn({
      ...patterned,
      provenance: { used_fact_ids: usedFactIds },
      sections: patterned.sections.map((section) => ({ ...section, used_fact_ids: usedFactIds })),
    });
    const verification = verifyResponse({
      response: finalRich,
      evidence: finalRich.data_used,
      allowedFactIds: allowedFacts.ids,
      toolsUsed: true,
      provenanceUsedFactIds: usedFactIds,
    });
    trace.outcome = {
      status: verification.ok ? "ok" : "fallback",
      notes: `${verification.reasons.join(",")}${verification.reasons.length ? "," : ""}used_fact_ids:${usedFactIds.length}`,
    };
    await persistTraceWithAssist(trace);
    updateContext(sessionId, {
      last_topic: {
        kind: "view",
        id: "operations.access_pathways_waiting_list",
        label: "Waiting list",
        updated_at: new Date().toISOString(),
      },
      last_answer_context: {
        trace_id: trace.trace_id,
        page_ids: ["operations.access_pathways_waiting_list"],
        finding_type: "longest_waiter",
        finding_summary: finalRich.summary.split("Checked:")[0].trim(),
        used_fact_ids: usedFactIds,
        updated_at: new Date().toISOString(),
      },
    });
    rememberRoutingPath("ops_waiting_list_extremes");
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: finalRich,
        sources: finalRich.data_used.map((d) => d.source),
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: allowedFacts.ids.length },
        provenance: { used_fact_ids: usedFactIds },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  if (earlyIntent === "conversational_misc") {
    const trace = createTraceBase({
      user_message: prompt,
      intent: "conversational_misc",
      intent_confidence: 0.86,
    });
    trace.route = { mode: "deterministic", reason: "Conversational miscellaneous prompt", routing_path: "conversational_misc" };
    trace.goal = "Provide conversational general answer";
    trace.plan.steps = [
      { id: "1", kind: "tool", name: "llm.general_answer" },
      { id: "2", kind: "respond", name: "conversational_misc_response" },
    ];
    trace.verification = { required: false, rules: [] };
    trace.outcome = { status: "ok", notes: "conversational_misc_handled" };
    trace.constraints.push(`domain:${promptDomain}`);
    trace.constraints.push("general_answer:true");

    const generalAnswer = await runLlmGeneralAnswer({ prompt });
    const answerText = String(generalAnswer?.data?.answer || "").trim() || "I can help with that. Tell me the angle you want.";
    const title = "General";
    const richBase: RichResponse = {
      title,
      summary: answerText,
      voice_summary: answerText,
      sections: [],
      tables: [],
      next_actions: [
        {
          label: "Switch back to Operations",
          rationale: "Return to app navigation.",
          action_type: "open",
          payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "Operations" },
        },
      ],
      context_cards: [],
      data_used: [],
      confidence: { level: "medium", rationale: "General conversational answer from public LLM tool." },
      signal_strength: { level: "low", score: 10, rationale: "No connector data used." },
    };
    const withPreferences = applyPreferencesToRichResponse(richBase, ctx.preferences ?? {});
    // Don't add voiceSummary prefix to general answers — the LLM already handles tone naturally
    const rich = applyPatternToRichResponse({
      rich: withPreferences,
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "conversational_misc",
      preferences: ctx.preferences,
    });
    const finalRich = sanitizeRichForReturn(rich);

    await persistTraceWithAssist(trace);
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: finalRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: true }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  if (earlyIntent === "unknown_domain_query") {
    const detected = detectUnknownDomainWord(prompt) || "that topic";
    const trace = createTraceBase({
      user_message: prompt,
      intent: "unknown_domain_query",
      intent_confidence: 0.84,
    });
    trace.route = {
      mode: "deterministic",
      reason: "Plausible domain detected but unsupported by connected app sources",
      routing_path: "unknown_domain",
    };
    trace.goal = "Set clear boundary for unsupported domain and request one clarifying direction";
    trace.plan.steps = [{ id: "1", kind: "respond", name: "unknown_domain_response" }];
    trace.verification = { required: false, rules: [] };
    trace.constraints.push(`domain:${promptDomain}`);
    trace.constraints.push(`unknown_domain:${detected}`);
    trace.outcome = { status: "ok", notes: `unknown_domain:${detected}` };

    const rich = sanitizeRichForReturn({
      title: "I don't have that connected yet",
      summary: `I don't currently have a data source for ${detected}. Is that internal staff forums, patient feedback, or something external?`,
      voice_summary: `I don't currently have a data source for ${detected}. Is that internal staff forums, patient feedback, or something external?`,
      sections: [],
      tables: [],
      next_actions: [
        {
          label: "Connect new source",
          rationale: "Add a system for this domain.",
          action_type: "connect",
          payload: { type: "connect_source", domain: detected },
        },
        {
          label: "Clarify system",
          rationale: "Specify which system or dataset this refers to.",
          action_type: "ask",
          payload: { type: "clarify", kind: "missing_required_tool", choice: `clarify_${detected}` },
        },
      ],
      context_cards: [],
      data_used: [],
      confidence: { level: "medium", rationale: "Deterministic unsupported-domain boundary response." },
      signal_strength: { level: "low", score: 5, rationale: "No tools or connectors called." },
    });

    await persistTraceWithAssist(trace);
    rememberRoutingPath("unknown_domain");
    const response = NextResponse.json(
      {
        response: rich.summary,
        rich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  if (snapshotSection || isExploreQuery(prompt) || emotionActionRoute === "explore_mode") {
    const exploreSection = snapshotSection || inferExploreSection(prompt);
    let selectedViewIds = selectExploreViews(VIEW_REGISTRY, exploreSection).slice(0, 2);
    if (selectedViewIds.length === 0) {
      selectedViewIds = selectExploreViews(VIEW_REGISTRY, null).slice(0, 2);
    }
    if (selectedViewIds.length === 0) {
      const trace = createTraceBase({
        user_message: prompt,
        intent: "unsupported_domain",
        intent_confidence: 0.6,
      });
      trace.route = { mode: "deterministic", reason: "Explore mode with no implemented views", routing_path: "explore_mode" };
      trace.outcome = { status: "fallback", notes: "explore_mode_no_views" };
      const assistedNoViews = await maybeApplyReasoningAssist({
        trace,
        routing_path: "explore_mode",
        rich: {
          title: "Here's what I can show you",
          summary: "I can explore pages once at least one implemented view is available.",
          voice_summary: "I can explore pages once at least one implemented view is available.",
          sections: [{ heading: "Explore mode", body: "No implemented views are currently available.", bullets: [] }],
          tables: [],
          next_actions: [],
          context_cards: [],
          data_used: [],
          confidence: { level: "low", rationale: "No implemented views available." },
          signal_strength: { level: "low", score: 0, rationale: "No evidence available." },
        },
      });
      const finalNoViewsRich = sanitizeRichForReturn(assistedNoViews);
      await persistTraceWithAssist(trace);
      const response = NextResponse.json(
        {
          response: finalNoViewsRich.summary,
          rich: finalNoViewsRich,
          sources: [],
          topic: "operational_query",
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }

    const trace = createTraceBase({
      user_message: prompt,
      intent: "operational_query",
      intent_confidence: 0.82,
    });
    trace.route = { mode: "deterministic", reason: "Explore mode pages-first routing", routing_path: "explore_mode" };
    trace.goal = "Explore available pages and summarise what is available";
    trace.plan.steps = [
      { id: "1", kind: "tool", name: "view.read", input: { view_ids: selectedViewIds } },
      { id: "2", kind: "respond", name: "explore_summary" },
    ];
    trace.verification = { required: true, rules: ["evidence_required"] };
    trace.constraints.push("explore_mode:true");
    trace.constraints.push(`view_budget:${selectedViewIds.length}`);
    if (exploreSection) {
      trace.constraints.push(`explore_section:${exploreSection}`);
    }

    const firewall = await runTruthFirewall({
      prompt,
      intent: "operational_query",
      selectedTools: ["view.read"],
      selectedToolInputs: {
        "view.read": selectedViewIds.length > 1
          ? { view_ids: selectedViewIds }
          : { view_id: selectedViewIds[0] },
      },
      context: { connectedSources: connected, missingSources: missing },
    });

    const allowedFacts = buildAllowedFacts({
      selectedTools: ["view.read"],
      evidence: firewall.evidence,
    });
    trace.allowed_facts.ids = allowedFacts.ids;
    trace.constraints.push(`allowed_fact_count:${allowedFacts.ids.length}`);

    const viewsRead = selectedViewIds
      .map((id) => VIEW_REGISTRY.find((view) => view.id === id))
      .filter(Boolean)
      .map((view) => ({ id: view!.id, label: view!.label }));
    const viewFacts = Array.isArray(firewall.facts.views)
      ? firewall.facts.views as Array<{ view_id: string; data: any }>
      : [];
    const findCount = (viewId: string) => {
      const data = viewFacts.find((entry) => entry.view_id === viewId)?.data;
      if (Array.isArray(data)) return data.length;
      if (Array.isArray(data?.rows)) return data.rows.length;
      if (Array.isArray(data?.items)) return data.items.length;
      return null;
    };
    const bullets = viewsRead.map((view) => {
      const count = findCount(view.id);
      return count === null ? `${view.label}: data available` : `${view.label}: ${count} records available`;
    });
    const snapshotSections = viewFacts.flatMap((entry) => {
      const label = VIEW_REGISTRY.find((view) => view.id === entry.view_id)?.label ?? toTitle(entry.view_id);
      const table = coerceTableFromViewData(entry.data);
      if (!table) return [];
      return [{
        type: "table" as const,
        title: label,
        heading: label,
        body: "Table snapshot",
        bullets: [],
        table,
      }];
    });
    const summaryBase = viewsRead.length > 0
      ? `I sampled ${viewsRead.map((view) => view.label).join(" and ")} so you can choose where to go deeper next.`
      : "I can start from available pages and show you what is currently populated.";

    const actionViews = viewsRead
      .map((view) => ({ view, deeplink: viewIdToDeeplink(view.id) }))
      .filter((entry) => Boolean(entry.deeplink));
    const followUps = ["PTL breaches", "High waiters", "RTT", "Waiting list"];
    const next_actions: RichResponse["next_actions"] = [
      ...actionViews.map((entry) => ({
        label: `Open ${entry.view.label}`,
        rationale: `Inspect ${entry.view.label} directly.`,
        action_type: "open" as const,
        payload: { type: "open_view", deeplink: entry.deeplink, label: entry.view.label },
      })),
      ...followUps.map((choice, idx) => ({
        label: choice,
        rationale: "Use a focused follow-up query.",
        action_type: "ask" as const,
        action_id: `act_explore_followup_${idx}`,
        requires_confirmation: false,
        payload: { type: "clarify", kind: "missing_required_tool", choice },
      })),
      {
        label: "Open Explore Canvas",
        rationale: "Capture next steps from this exploration.",
        action_type: "open" as const,
        payload: {
          type: "open_canvas",
          canvas: {
            title: "Explore results",
            kind: "summary",
            markdown: buildExploreCanvasMarkdown(viewsRead.map((view) => view.label)),
          },
        },
      },
    ];

    const richBase: RichResponse = {
      title: "Here's what I can show you",
      summary: summaryBase,
      voice_summary: summaryBase,
      sections: [
        ...snapshotSections,
        {
          heading: "Available now",
          body: "I started with a small pages-first sample.",
          bullets,
        },
      ],
      tables: [],
      next_actions,
      context_cards: [],
      data_used: firewall.evidence,
      confidence: firewall.confidence,
      signal_strength: firewall.signal_strength,
    };
    if (snapshotSections.length > 0) {
      trace.constraints.push("table_snapshot:true");
    }
    const withPreferences = applyPreferencesToRichResponse(richBase, ctx.preferences ?? {});
    const rich = applyPatternToRichResponse({
      rich: withPreferences,
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "explore_mode",
      preferences: ctx.preferences,
    });
    const assistedRich = await maybeApplyReasoningAssist({
      trace,
      routing_path: trace.route.routing_path ?? "explore_mode",
      rich,
      usedFactIdsCount: rich.data_used.length > 0 ? 1 : 0,
    });
    const finalRich = sanitizeRichForReturn(assistedRich);

    const usedFactCandidates = finalRich.data_used.flatMap((entry) => allowedFacts.by_source[entry.source] ?? []);
    const usedFactIds = uniqueStableSubset(usedFactCandidates, allowedFacts.ids);
    const verification = verifyResponse({
      response: finalRich,
      evidence: finalRich.data_used,
      allowedFactIds: allowedFacts.ids,
      toolsUsed: true,
      provenanceUsedFactIds: usedFactIds,
    });
    trace.outcome = {
      status: verification.ok ? "ok" : "fallback",
      notes: `explore_mode,used_fact_ids:${usedFactIds.length}${verification.reasons.length ? `,${verification.reasons.join(",")}` : ""}`,
    };

    await persistTraceWithAssist(trace);
    updateContext(sessionId, {
      last_topic: {
        kind: "view",
        id: selectedViewIds[0],
        label: viewsRead[0]?.label ?? "Explore view",
        updated_at: new Date().toISOString(),
      },
    });
    rememberRoutingPath("explore_mode");
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: { ...finalRich, provenance: { used_fact_ids: usedFactIds } },
        sources: firewall.evidence.map((item) => item.source),
        topic: "operational_query",
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: allowedFacts.ids.length },
        provenance: { used_fact_ids: usedFactIds },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  const pendingClarification = ctx.pending_clarification;
  let clarificationResolvedChoice: string | null = null;
  let clarificationPriorTraceId: string | undefined;
  if (pendingClarification) {
    const fallbackDomains = pendingClarification.tools
      ? Array.from(new Set(pendingClarification.tools.map((tool) => getAuthorityForTool(tool)).filter((d) => d !== "unknown")))
      : [];
    const resolutionOptions = pendingClarification.kind === "missing_required_tool"
      ? (pendingClarification.tools ?? fallbackDomains)
      : (pendingClarification.domains ?? fallbackDomains);
    const choice = resolveClarificationDomainChoice({
      message: prompt,
      domains: resolutionOptions,
    });
    if (!choice) {
      const trace = createTraceBase({
        user_message: prompt,
        intent: classifyIntent(prompt),
        intent_confidence: 0.5,
      });
      trace.route = { mode: "deterministic", reason: "Awaiting clarification choice", routing_path: "metric_clarify" };
      trace.plan.steps = [
        {
          id: "1",
          kind: "clarify",
          name: pendingClarification.kind === "domain_priority" ? "clarify_domain_priority" : "missing_required_tool_selection",
          input: { domains: pendingClarification.domains, tools: pendingClarification.tools },
        },
        { id: "2", kind: "respond", name: "clarify_question" },
      ];
      trace.teaching = {
        ...trace.teaching,
        preferences: {
          extracted: extractedPreferences,
          applied: ctx.preferences ?? {},
        },
        clarification: {
          requested: true,
          kind: pendingClarification.kind,
          options: pendingClarification.domains ?? pendingClarification.tools ?? [],
          resolved: false,
          prior_trace_id: pendingClarification.trace_id,
        },
      };
      trace.outcome = { status: "ok", notes: "clarification_requested" };
      await persistTraceWithAssist(trace);
      const clarificationBase = buildClarificationResponse({
        kind: pendingClarification.kind,
        domains: pendingClarification.domains,
        tools: pendingClarification.tools,
      }, ctx.preferences ?? {});
      const clarificationVoiceContext = buildVoiceContext({
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: trace.route.routing_path ?? "metric_clarify",
        preferences: ctx.preferences,
        page_label: ctx.page_context?.view,
      });
      const clarificationQuestion = voiceClarifyQuestion(clarificationVoiceContext, clarificationBase.summary);
      const clarificationRich = applyPreferencesToRichResponse({
        ...clarificationBase,
        summary: clarificationQuestion,
        voice_summary: clarificationQuestion,
      }, ctx.preferences ?? {});
      const patternedClarificationRich = applyPatternToRichResponse({
        rich: clarificationRich,
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: trace.route.routing_path ?? "metric_clarify",
        preferences: ctx.preferences,
        question: clarificationQuestion,
      });
      const response = NextResponse.json(
        {
          response: patternedClarificationRich.summary,
          rich: patternedClarificationRich,
          sources: [],
          topic: trace.intent,
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }
    clarificationResolvedChoice = choice;
    clarificationPriorTraceId = pendingClarification.trace_id;
    updateContext(sessionId, { pending_clarification: undefined });
  }

  const requestedStateAction = detectRequestedStateAction(prompt);
  if (requestedStateAction) {
    const riskDecision = assessActionRisk(requestedStateAction);
    if (riskDecision.requires_approval) {
      const userSummary = buildApprovalUserSummary(requestedStateAction);
      const preview = buildApprovalPreview(requestedStateAction);
      const dryRun = true;
      const trace = createTraceBase({
        user_message: prompt,
        intent: classifyIntent(prompt),
        intent_confidence: 0.75,
      });
      trace.route = { mode: "deterministic", reason: "Approval required for state-changing action", routing_path: "approval_gate" };
      trace.governance = {
        approval: {
          requested: true,
          risk: riskDecision.risk,
          reason: riskDecision.reason,
          action_type: requestedStateAction.type,
          approved: false,
          executed: false,
          outcome: "approval_requested",
        },
      };
      trace.outcome = { status: "ok", notes: "approval_requested" };

      const [approveAction, cancelAction] = buildApprovalActions();

      updateContext(sessionId, {
        pending_approval: {
          created_at: new Date().toISOString(),
          trace_id: trace.trace_id,
          action: requestedStateAction,
          risk: riskDecision.risk,
          reason: riskDecision.reason,
          user_summary: userSummary,
          preview,
          dry_run: dryRun,
        },
        pendingActions: [approveAction, cancelAction],
      });

      await logAudit({
        userId: "user",
        actionType: "approval_requested",
        toolsCalled: [requestedStateAction.type],
        recordsAccessed: [],
        outcome: `trace:${trace.trace_id}`,
        correlationId: sessionId,
      });
      await persistTraceWithAssist(trace);

      const previewChanges = (preview.changes ?? []).slice(0, 5);
      const previewBullets = [
        `Target: ${preview.target ?? "unknown"}`,
        ...previewChanges.map((change) => `${change.field} -> ${String(change.to ?? "not available")}`),
        `Reversible: ${typeof preview.reversible === "boolean" ? (preview.reversible ? "yes" : "no") : "unknown"}`,
      ];
      const rich: RichResponse = {
        title: "Confirm before I proceed",
        summary: `You are about to: ${userSummary}${dryRun ? " (dry run: no changes will be applied)" : ""}.`,
        voice_summary: `You are about to: ${userSummary}${dryRun ? " (dry run: no changes will be applied)" : ""}.`,
        sections: [
          {
            heading: "What will change",
            body: riskDecision.reason,
            bullets: previewBullets,
          },
          {
            heading: "What happens next",
            body: "Choose approve or cancel.",
            bullets: [
              "Approve: I will apply the change.",
              "Cancel: Nothing changes.",
            ],
          },
        ],
        tables: [],
        next_actions: [approveAction, cancelAction],
        context_cards: [],
        data_used: [],
        confidence: { level: "high", rationale: "Policy-based risk gate." },
        signal_strength: { level: "medium", score: 45, rationale: "Awaiting explicit user approval." },
      };
      const patterned = applyPatternToRichResponse({
        rich,
        trace_id: trace.trace_id,
        intent: trace.intent,
        routing_path: trace.route.routing_path ?? "approval_gate",
        preferences: ctx.preferences,
      });
      const response = NextResponse.json(
        {
          response: patterned.summary,
          rich: patterned,
          sources: [],
          topic: "approval",
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }
  }

  const domainToIntent = (domain: string): ReturnType<typeof classifyIntent> => {
    if (domain === "roster") return "staffing";
    if (domain === "governance") return "governance_query";
    return "operational_query";
  };
  const pageContext = ctx.page_context;
  const pendingClarificationDomains = pendingClarification?.domains ?? [];
  const isPendingClarificationFlow = pendingClarification?.kind === "domain_priority" &&
    pendingClarificationDomains.some((domain) => domain === "planning" || domain === "collaboration");
  const isPendingChoice = clarificationResolvedChoice === "planning" || clarificationResolvedChoice === "collaboration";
  const planningLikeQuery = isPlanningLikeQuery(prompt);

  let classifiedIntent = clarificationResolvedChoice
    ? domainToIntent(clarificationResolvedChoice)
    : (plannerGate.fallback_to_deterministic ? classifyIntent(prompt) : plannerGate.final_intent);
  const pendingWorkQuery = isPendingWorkQuery(prompt) || (isPendingClarificationFlow && isPendingChoice);
  if (pendingWorkQuery && classifiedIntent === "unsupported_domain") {
    classifiedIntent = "operational_query";
  }
  let thinkPlan: ThinkPlan | null = null;
  let deepReasoningActive = false;
  let deepReasoningViewIds: string[] = [];
  const canUseDeepReasoning =
    !pendingWorkQuery &&
    (classifiedIntent === "operational_query" || classifiedIntent === "governance_query" || classifiedIntent === "staffing");
  if (canUseDeepReasoning) {
    debugStage = "think";
    thinkPlan = await buildThinkPlan({
      message: prompt,
      page_context: pageContext,
      viewRegistry: VIEW_REGISTRY,
      findRelevantViews,
      classifyIntent,
    });
    const readStep = thinkPlan.steps.find((step) => step.kind === "read_views") as Extract<typeof thinkPlan.steps[number], { kind: "read_views" }> | undefined;
    if (readStep && readStep.view_ids.length > 0) {
      deepReasoningActive = true;
      deepReasoningViewIds = [...readStep.view_ids];
    }
  }
  let contract = getContract(classifiedIntent);
  let selectedTools = selectToolsForMessage({ intent: classifiedIntent, message: prompt });
  if (!plannerGate.fallback_to_deterministic && plannerGate.selectedTools.length > 0) {
    selectedTools = [...plannerGate.selectedTools];
  }
  if (clarificationResolvedChoice) {
    const toolsFromPending = pendingClarification?.tools ?? contract.allowedTools;
    const domainFiltered = filterToolsByDomain(toolsFromPending, clarificationResolvedChoice);
    selectedTools = domainFiltered.length > 0 ? domainFiltered : selectedTools;
    classifiedIntent = domainToIntent(clarificationResolvedChoice);
    contract = getContract(classifiedIntent);
  }

  let missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
  let conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  const isMultiDomainExplicit = isExplicitMultiDomainRequest(prompt);
  let pagesFirst = false;
  let pagesFirstViewId: string | null = null;
  let viewFinderUsed = false;
  let viewFinderSelectedIds: string[] = [];
  let viewFinderTopIds: string[] = [];
  let selectedToolInputs: Record<string, any> | undefined = plannerGate.selectedToolInputs;
  // For locate intent, search only views that contain raw person-name data.
  // Patient views: operations.ptl (master pathway list — every patient is here)
  // Staff views:   logistics.roster_shifts (assignee field with staff names)
  // Entity type drives which set is searched; page context is the tiebreaker when no explicit clue.
  if (classifiedIntent === "locate") {
    const entityName = extractEntityName(prompt);
    if (entityName) {
      const currentPageViewId = deriveViewIdFromPageContext(pageContext);
      const entityType = classifyLocateEntityType(prompt, pageContext?.section);
      const PATIENT_VIEWS = ["operations.ptl"];
      const STAFF_VIEWS = ["logistics.roster_shifts"];
      const baseViews = entityType === "staff" ? STAFF_VIEWS : entityType === "patient" ? PATIENT_VIEWS : [...PATIENT_VIEWS, ...STAFF_VIEWS];
      // Always include the current page first (user can see it, highest relevance)
      const searchViewIds = currentPageViewId && !baseViews.includes(currentPageViewId)
        ? [currentPageViewId, ...baseViews]
        : baseViews;
      selectedToolInputs = {
        ...(selectedToolInputs ?? {}),
        "workforce.person_lookup": { name: entityName },
        "view.read": { view_ids: searchViewIds },
      };
    }
  }
  let routingPath: "pending_override" | "page_context" | "view_finder" | "metric_clarify" | "connector_fallback" | "meta_feedback" | "section_overview" | "explore_mode" | "conversational_misc" | "conversational_default" | "ops_waiting_list_extremes" | "deep_reasoning" | "normal" = "normal";
  const defaultPendingViewIds = ["planning.sessions", "collaboration.deliverables"];
  let forcePendingDomainClarification = false;
  if (!plannerGate.fallback_to_deterministic) {
    if (plannerGate.final_routing_path === "conversational_misc") routingPath = "conversational_misc";
    if (plannerGate.final_routing_path === "section_overview") routingPath = "section_overview";
    if (plannerGate.final_routing_path === "metric_clarify") routingPath = "metric_clarify";
    if (plannerGate.final_routing_path === "view_finder") routingPath = "view_finder";
    if (plannerGate.final_routing_path === "page_context") routingPath = "page_context";
  }

  if (pendingWorkQuery) {
    routingPath = "pending_override";
    const pendingChoiceView = clarificationResolvedChoice === "planning"
      ? "planning.sessions"
      : clarificationResolvedChoice === "collaboration"
        ? "collaboration.deliverables"
        : null;
    const pagePreferredView = derivePendingWorkViewIdFromPageContext(pageContext);
    const selectedPendingViews = pendingChoiceView
      ? [pendingChoiceView]
      : pagePreferredView
        ? [pagePreferredView]
        : [...defaultPendingViewIds];
    const hasUnimplementedPendingView = selectedPendingViews.some((viewId) => {
      const spec = VIEW_REGISTRY.find((view) => view.id === viewId);
      return !spec || !spec.implemented || !spec.read;
    });
    if (hasUnimplementedPendingView) {
      forcePendingDomainClarification = true;
      selectedTools = [];
      selectedToolInputs = undefined;
    } else {
      selectedTools = ["view.read"];
      viewFinderUsed = true;
      viewFinderSelectedIds = [...selectedPendingViews];
      viewFinderTopIds = [...defaultPendingViewIds];
      selectedToolInputs = {
        "view.read": selectedPendingViews.length > 1
          ? { view_ids: selectedPendingViews, filters: {} }
          : { view_id: selectedPendingViews[0], filters: {} },
      };
      missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
      conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
    }
  }

  const waitingListExtremesQuery = isWaitingListExtremesQuery(prompt);
  const waitingListMacroQuery = !waitingListExtremesQuery && isWaitingListMacroQuestion(prompt);
  const cancer2wwQuery = isCancer2WWQuery(prompt);
  const dataQualityQuery = isDataQualityQuery(prompt);
  const milestonesQuery = isMilestonesQuery(prompt);
  const clockEventsQuery = isClockEventsQuery(prompt);
  const breachTrackingQuery = isBreachTrackingQuery(prompt);
  const triageQuery = isTriageQuery(prompt);
  const referralQuery = isReferralQuery(prompt);
  if (!pendingWorkQuery && waitingListExtremesQuery) {
    routingPath = "ops_waiting_list_extremes";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.access_pathways_waiting_list"];
    viewFinderTopIds = ["operations.access_pathways_waiting_list"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.access_pathways_waiting_list", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && waitingListMacroQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.access_pathways_waiting_list"];
    viewFinderTopIds = ["operations.access_pathways_waiting_list", "operations.waiting_list_management", "operations.waiting"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.access_pathways_waiting_list", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && cancer2wwQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.cancer_2ww"];
    viewFinderTopIds = ["operations.cancer_2ww", "operations.cancer"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.cancer_2ww", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && !cancer2wwQuery && dataQualityQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.validation_data_quality"];
    viewFinderTopIds = ["operations.validation_data_quality", "operations.validation"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.validation_data_quality", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && !cancer2wwQuery && !dataQualityQuery && clockEventsQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.clock_starts_stops"];
    viewFinderTopIds = ["operations.clock_starts_stops", "operations.clock"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.clock_starts_stops", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && !cancer2wwQuery && !dataQualityQuery && !clockEventsQuery && milestonesQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.pathway_milestones"];
    viewFinderTopIds = ["operations.pathway_milestones", "operations.milestones"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.pathway_milestones", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && !cancer2wwQuery && !dataQualityQuery && !clockEventsQuery && !milestonesQuery && breachTrackingQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.breach_tracking"];
    viewFinderTopIds = ["operations.breach_tracking", "operations.breach"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.breach_tracking", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && !cancer2wwQuery && !dataQualityQuery && !clockEventsQuery && !milestonesQuery && !breachTrackingQuery && triageQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.triage_status"];
    viewFinderTopIds = ["operations.triage_status", "operations.triage"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.triage_status", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && !cancer2wwQuery && !dataQualityQuery && !clockEventsQuery && !milestonesQuery && !breachTrackingQuery && !triageQuery && referralQuery) {
    routingPath = "view_finder";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = ["operations.referral_management"];
    viewFinderTopIds = ["operations.referral_management", "operations.referrals"];
    selectedToolInputs = {
      "view.read": { view_id: "operations.referral_management", filters: {} },
    };
    missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (!pendingWorkQuery && !waitingListExtremesQuery && !waitingListMacroQuery && !cancer2wwQuery && !dataQualityQuery && !clockEventsQuery && !milestonesQuery && !breachTrackingQuery && !triageQuery && !referralQuery && deepReasoningActive && deepReasoningViewIds.length > 0) {
    routingPath = "deep_reasoning";
    selectedTools = ["view.read"];
    viewFinderUsed = true;
    viewFinderSelectedIds = [...deepReasoningViewIds];
    viewFinderTopIds = [...deepReasoningViewIds];
    selectedToolInputs = {
      "view.read": deepReasoningViewIds.length > 1
        ? { view_ids: deepReasoningViewIds, filters: pageContext?.filters }
        : { view_id: deepReasoningViewIds[0], filters: pageContext?.filters },
    };
    missingRequiredTools = [];
    conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
  }

  if (
    !pendingWorkQuery &&
    !waitingListExtremesQuery &&
    !waitingListMacroQuery &&
    !cancer2wwQuery &&
    !dataQualityQuery &&
    !clockEventsQuery &&
    !milestonesQuery &&
    !breachTrackingQuery &&
    !triageQuery &&
    !referralQuery &&
    !deepReasoningActive &&
    (
      classifiedIntent === "operational_query" ||
      classifiedIntent === "governance_query" ||
      promptDomain === "app"
    )
  ) {
    if (pageContext) {
      routingPath = "page_context";
      pagesFirst = true;
      pagesFirstViewId = deriveViewIdFromPageContext(pageContext) || `${pageContext.section}.${pageContext.view || "unknown"}`;
      selectedTools = ["view.read"];
      selectedToolInputs = {
        "view.read": {
          view_id: pagesFirstViewId,
          filters: pageContext?.filters,
        },
      };
      missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
      conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
    } else {
      routingPath = "view_finder";
      viewFinderUsed = true;
      const registryInput = VIEW_REGISTRY.map((view) => ({
        id: view.id,
        label: view.label,
        section: view.section,
        implemented: view.implemented,
        notes: view.notes,
      }));
      const candidates = findRelevantViews({ message: prompt, registry: registryInput });
      viewFinderTopIds = candidates.slice(0, 3).map((candidate) => candidate.id);
      const implementedCandidates = candidates.filter((candidate) => {
        const spec = VIEW_REGISTRY.find((view) => view.id === candidate.id);
        return Boolean(spec?.implemented) && candidate.reasons.some((reason) => reason.endsWith("_match"));
      });
      const first = implementedCandidates[0];
      const second = implementedCandidates[1];
      if (first) {
        viewFinderSelectedIds = [first.id];
        if (second && Math.abs(first.score - second.score) <= 1) {
          viewFinderSelectedIds.push(second.id);
        }
        selectedTools = ["view.read"];
        selectedToolInputs = {
          "view.read": viewFinderSelectedIds.length > 1
            ? { view_ids: viewFinderSelectedIds }
            : { view_id: viewFinderSelectedIds[0] },
        };
        missingRequiredTools = (contract.requiredTools ?? []).filter((tool) => !selectedTools.includes(tool));
        conflictsResult = detectAuthorityConflicts(selectedTools, getAuthorityForTool);
      }
    }
  }

  const trace = createTraceBase({
    user_message: prompt,
    intent: classifiedIntent,
    intent_confidence: 0.5,
  });
  const sessionPreferences = ctx.preferences ?? {};
  if (sessionPreferences.verbosity) trace.constraints.push(`verbosity:${sessionPreferences.verbosity}`);
  if (sessionPreferences.format) trace.constraints.push(`format:${sessionPreferences.format}`);
  if (sessionPreferences.tone) trace.constraints.push(`tone:${sessionPreferences.tone}`);
  trace.teaching = {
    ...trace.teaching,
    preferences: {
      extracted: extractedPreferences,
      applied: sessionPreferences,
    },
  };
  if (plannerGate.clarify_question) {
    trace.constraints.push(`llm_planner_clarify:${plannerGate.clarify_question}`);
  }
  if (clarificationResolvedChoice) {
    trace.constraints.push(`clarification_resolved:${clarificationResolvedChoice}`);
    trace.teaching = {
      ...trace.teaching,
      clarification: {
        resolved: true,
        choice: clarificationResolvedChoice,
        prior_trace_id: clarificationPriorTraceId,
      },
    };
  }
  trace.conflicts = [...(trace.conflicts ?? []), ...(conflictsResult.conflicts ?? [])];

  trace.constraints.push(`domain:${promptDomain}`);
  trace.constraints.push(`explain_mode:concise`);
  trace.constraints.push(`explain_trigger:${explainTrigger ? "true" : "false"}`);
  trace.constraints.push(`authority_primary:${getPrimaryAuthorityForIntent(trace.intent)}`);
  trace.constraints.push(`tools_allowed:${contract.allowedTools.length ? contract.allowedTools.join(",") : "none"}`);
  trace.constraints.push(`tools_selected:${selectedTools.length ? selectedTools.join(",") : "none"}`);
  const toolRiskLevels = selectedTools.map((toolName) => `${toolName}:${assessToolRisk(toolName).risk}`);
  if (toolRiskLevels.length > 0) {
    trace.constraints.push(`tool_risk:${toolRiskLevels.join("|")}`);
  }
  trace.constraints.push(`domains_selected:${conflictsResult.domains.length ? conflictsResult.domains.join(",") : "none"}`);
  if (pagesFirst) {
    trace.constraints.push("pages_first:true");
  }
  if (viewFinderUsed) {
    trace.constraints.push("view_finder_used:true");
    trace.constraints.push(`view_candidates_top:${viewFinderTopIds.length ? viewFinderTopIds.join(",") : "none"}`);
    trace.constraints.push(`view_budget:${viewFinderSelectedIds.length || 0}`);
  }
  if (pendingWorkQuery) {
    trace.constraints.push("pending_work:true");
    trace.constraints.push("pages_first:true");
  }
  if (waitingListExtremesQuery) {
    trace.constraints.push("waiting_list_extremes:true");
  }
  if (waitingListMacroQuery) {
    trace.constraints.push("waiting_list_macro:true");
  }
  if (cancer2wwQuery) {
    trace.constraints.push("cancer_2ww_query:true");
  }
  if (dataQualityQuery) {
    trace.constraints.push("data_quality_query:true");
  }
  if (milestonesQuery) {
    trace.constraints.push("milestones_query:true");
  }
  if (clockEventsQuery) {
    trace.constraints.push("clock_events_query:true");
  }
  if (breachTrackingQuery) {
    trace.constraints.push("breach_tracking_query:true");
  }
  if (referralQuery) {
    trace.constraints.push("referrals_query:true");
  }
  if (thinkPlan) {
    trace.constraints.push("deep_reasoning:true");
    trace.constraints.push(`think_intent:${thinkPlan.intent}`);
    if (thinkPlan.view_candidates.length > 0) {
      trace.constraints.push(`think_candidates:${thinkPlan.view_candidates.slice(0, 3).map((item) => item.id).join(",")}`);
    }
  }
  if (trace.intent === "smalltalk") {
    trace.goal = "Handle conversational interaction";
    trace.constraints.push("No external data access");
    trace.route = {
      mode: "deterministic",
      reason: "Smalltalk requires no tools",
    };
    trace.verification = { required: false, rules: [] };
  }
  if (trace.intent === "operational_query") {
    trace.goal = "Retrieve and summarize operational data";
    trace.route = {
      mode: "llm_structured",
      reason: "Operational query requires tool-backed structured response",
    };
    trace.verification = {
      required: true,
      rules: ["no_unverified_numbers", "evidence_required"],
    };
  }
  if (trace.intent === "unsupported_domain") {
    trace.route = {
      mode: "deterministic",
      reason: "Unsupported domain — safe refusal",
    };
    trace.verification = { required: false, rules: [] };
  }
  if (deepReasoningActive && routingPath === "deep_reasoning") {
    trace.route = {
      mode: "deterministic",
      reason: "Deep reasoning pipeline (think-read-verify-respond)",
      routing_path: "deep_reasoning",
    };
    trace.verification = { required: true, rules: ["evidence_required", "no_unverified_numbers"] };
  }
  const metricClarifyEligible =
    isExplicitMetricClarifyQuery(prompt) &&
    !pendingWorkQuery &&
    !planningLikeQuery &&
    !antiFallbackIntent;
  const mappedThinkSteps = thinkPlan?.steps.map((step, idx) => {
    const id = String(idx + 1);
    if (step.kind === "read_views") {
      return {
        id,
        kind: "tool" as const,
        name: "view.read",
        input: { view_ids: step.view_ids, rationale: step.rationale },
      };
    }
    if (step.kind === "clarify") {
      return {
        id,
        kind: "clarify" as const,
        name: "missing_required_tool_selection",
        input: { question: step.question, options: step.options },
      };
    }
    return {
      id,
      kind: "respond" as const,
      name: "final_response",
      input: { rationale: step.rationale },
    };
  });
  if (forcePendingDomainClarification) {
    trace.ambiguity.score = Math.max(trace.ambiguity.score, 0.7);
    trace.ambiguity.reasons.push("pending_work_domain_clarification");
    trace.route = {
      mode: "deterministic",
      reason: "Pending work view is not implemented for current selection",
    };
    trace.plan.steps = [
      { id: "1", kind: "clarify", name: "clarify_domain_priority", input: { domains: ["planning", "collaboration"] } },
      { id: "2", kind: "respond", name: "clarify_question" },
    ];
  } else if (missingRequiredTools.length > 0 && metricClarifyEligible) {
    if (!pendingWorkQuery) routingPath = "metric_clarify";
    trace.ambiguity.score = Math.max(trace.ambiguity.score, 0.7);
    trace.ambiguity.reasons.push("missing_required_tool_selection");
    trace.conflicts?.push({
      kind: "missing_required",
      severity: "high",
      details: "required tools were not selected for this intent",
      tools: missingRequiredTools,
    });
    trace.route = {
      mode: "deterministic",
      reason: "Required tool selection missing",
    };
    trace.plan.steps = [
      { id: "1", kind: "clarify", name: "missing_required_tool_selection", input: { missing: missingRequiredTools } },
      { id: "2", kind: "respond", name: "respond_without_tools" },
    ];
  } else if (mappedThinkSteps && mappedThinkSteps.length > 0) {
    trace.plan.steps = mappedThinkSteps;
  } else if (contract.allowedTools.length > 0) {
    const toolSteps = selectedTools.map((tool, idx) => ({ id: String(idx + 1), kind: "tool" as const, name: tool }));
    const respondStepId = String(toolSteps.length + 1);
    trace.plan.steps = [...toolSteps, { id: respondStepId, kind: "respond", name: "final_response" }];
  } else if (trace.intent === "smalltalk") {
    trace.plan.steps = [{ id: "1", kind: "respond", name: "smalltalk_template" }];
  } else {
    trace.plan.steps = [{ id: "1", kind: "respond", name: "unsupported_response" }];
  }

  const noViewCandidates =
    !pendingWorkQuery &&
    viewFinderUsed &&
    viewFinderSelectedIds.length === 0 &&
    selectedTools.length === 0 &&
    (trace.intent === "operational_query" || trace.intent === "governance_query");
  if (noViewCandidates) {
    trace.ambiguity.score = Math.max(trace.ambiguity.score, 0.7);
    trace.ambiguity.reasons.push("view_finder_no_viable_candidates");
  }

  const shouldConversationalDefault = shouldRouteConversationalDefault({
    intent: trace.intent,
    selectedTools,
    hasViableViewCandidates: viewFinderSelectedIds.length > 0 || Boolean(pagesFirstViewId),
    isExplicitMetricQuery: isExplicitMetricClarifyQuery(prompt),
    isIntegrationCoverageQuery: isIntegrationCoverageQuery(prompt),
    isPendingWorkQuery: pendingWorkQuery,
    isPlanningLikeQuery: planningLikeQuery,
    antiFallbackIntent,
  }) || noViewCandidates;

  if (shouldConversationalDefault) {
    if (routingPath === "deep_reasoning" || deepReasoningActive) {
      const firstView = deepReasoningViewIds[0] || viewFinderSelectedIds[0] || pagesFirstViewId || "";
      const deeplink = firstView ? viewIdToDeeplink(firstView) : pageContext?.deeplink;
      trace.route = {
        mode: "deterministic",
        reason: "Deep reasoning found no usable rows after pages-first read",
        routing_path: "deep_reasoning",
      };
      trace.plan.steps = [{ id: "1", kind: "respond", name: "deep_reasoning_no_data_response" }];
      trace.outcome = { status: "fallback", notes: "deep_reasoning_no_rows" };
      const checkedLabel = firstView ? `Checked: ${firstView.replace(/\./g, " -> ")}` : "Checked: selected pages";
      const deepFallbackRich = sanitizeRichForReturn({
        title: "I checked the page, but there is no usable dataset yet",
        summary: "I can open the page, but the dataset returned no rows or missing fields for this query.",
        voice_summary: "I can open the page, but the dataset returned no rows or missing fields for this query.",
        sections: [
          {
            heading: "What I checked",
            body: checkedLabel,
            bullets: ["I did not find enough fields to answer this safely from evidence."],
          },
        ],
        tables: [],
        next_actions: deeplink ? [{
          label: "Open checked page",
          rationale: "Review the view directly.",
          action_type: "open",
          payload: { type: "open_view", deeplink, label: "Open page" },
        }] : [],
        context_cards: [],
        data_used: [],
        confidence: { level: "low", rationale: "No usable rows for grounded response." },
        signal_strength: { level: "low", score: 5, rationale: "No evidence rows available." },
      });
      await persistTraceWithAssist(trace);
      rememberRoutingPath("deep_reasoning");
      const response = NextResponse.json(
        {
          response: deepFallbackRich.summary,
          rich: deepFallbackRich,
          sources: [],
          topic: trace.intent,
          trace_id: trace.trace_id,
          debug_routing_path: trace.route.routing_path,
          ...debugBase({ llmUsed: false, stage: "respond" }),
          allowed_facts: { count: 0 },
          provenance: { used_fact_ids: [] },
          trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
        } satisfies ChatResponse,
      );
      if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
      return response;
    }
    routingPath = "conversational_default";
    trace.route = {
      mode: "deterministic",
      reason: "No tools or viable views selected, using conversational guidance fallback",
      routing_path: routingPath,
    };
    trace.plan.steps = [{ id: "1", kind: "respond", name: "conversational_default_response" }];
    trace.outcome = { status: "ok", notes: "conversational_default" };
    const rich = applyPatternToRichResponse({
      rich: applyPreferencesToRichResponse(buildConversationalDefaultResponse(), ctx.preferences ?? {}),
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: routingPath,
      preferences: ctx.preferences,
      question: "What outcome are you aiming for?",
    });
    const assisted = await maybeApplyReasoningAssist({
      trace,
      routing_path: routingPath,
      rich,
    });
    const finalRich = sanitizeRichForReturn(assisted);
    await persistTraceWithAssist(trace);
    rememberRoutingPath(routingPath);
    const response = NextResponse.json(
      {
        response: finalRich.summary,
        rich: finalRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  const multiDomainConflict = trace.conflicts?.find((conflict) => conflict.kind === "multi_domain");
  if (multiDomainConflict) {
    if (isMultiDomainExplicit) {
      trace.constraints.push("multi_domain:explicit");
    } else {
      trace.ambiguity.score = Math.max(trace.ambiguity.score, 0.75);
      trace.ambiguity.reasons.push("multi_domain_ambiguous");
      trace.route = {
        mode: "deterministic",
        reason: "Multiple authority domains selected without explicit priority",
      };
      trace.plan.steps = [
        { id: "1", kind: "clarify", name: "clarify_domain_priority", input: { domains: conflictsResult.domains } },
        { id: "2", kind: "respond", name: "clarify_question" },
      ];
    }
  }

  const firstPlanStep = trace.plan.steps[0];
  if (firstPlanStep?.kind === "clarify") {
    if (firstPlanStep.name === "missing_required_tool_selection" && !pendingWorkQuery) {
      routingPath = "metric_clarify";
    }
    trace.route = { ...trace.route, routing_path: routingPath };
    const clarificationKind = firstPlanStep.name === "clarify_domain_priority" ? "domain_priority" : "missing_required_tool";
    const clarificationDomains = firstPlanStep.name === "clarify_domain_priority" ? (firstPlanStep.input?.domains as string[] | undefined) : undefined;
    const clarificationTools = firstPlanStep.name === "missing_required_tool_selection" ? (firstPlanStep.input?.missing as string[] | undefined) : undefined;

    updateContext(sessionId, {
      pending_clarification: {
        kind: clarificationKind,
        domains: clarificationDomains,
        tools: clarificationTools,
        created_at: new Date().toISOString(),
        trace_id: trace.trace_id,
      },
    });

    trace.teaching = {
      ...trace.teaching,
      clarification: {
        requested: true,
        kind: clarificationKind,
        options: clarificationDomains ?? clarificationTools ?? [],
        resolved: false,
      },
    };
    trace.outcome = { status: "ok", notes: "clarification_requested" };
    await persistTraceWithAssist(trace);

    const clarificationBase = buildClarificationResponse({
      kind: clarificationKind,
      domains: clarificationDomains,
      tools: clarificationTools,
    }, ctx.preferences ?? {});
    const clarificationVoiceContext = buildVoiceContext({
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "metric_clarify",
      preferences: ctx.preferences,
      page_label: ctx.page_context?.view,
    });
    const clarificationQuestion = voiceClarifyQuestion(clarificationVoiceContext, clarificationBase.summary);
    const clarificationRich = applyPreferencesToRichResponse({
      ...clarificationBase,
      summary: clarificationQuestion,
      voice_summary: clarificationQuestion,
    }, ctx.preferences ?? {});
    const patternedClarificationRich = applyPatternToRichResponse({
      rich: clarificationRich,
      trace_id: trace.trace_id,
      intent: trace.intent,
      routing_path: trace.route.routing_path ?? "metric_clarify",
      preferences: ctx.preferences,
      question: clarificationQuestion,
    });
    const response = NextResponse.json(
      {
        response: patternedClarificationRich.summary,
        rich: patternedClarificationRich,
        sources: [],
        topic: trace.intent,
        trace_id: trace.trace_id,
        debug_routing_path: trace.route.routing_path,
        ...debugBase({ llmUsed: false }),
        allowed_facts: { count: 0 },
        provenance: { used_fact_ids: [] },
        trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
      } satisfies ChatResponse,
    );
    if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
    return response;
  }

  if (routingPath === "deep_reasoning") {
    debugStage = "read";
  }
  const firewall = await runTruthFirewall({
    prompt,
    intent: trace.intent,
    selectedTools,
    selectedToolInputs,
    context: { connectedSources: connected, missingSources: missing },
  });
  trace.intent_confidence = intentConfidenceFromLevel(firewall.confidence.level);

  const requiresConnected =
    firewall.intent === "operational_query" ||
    firewall.intent === "governance_query" ||
    firewall.intent === "staffing";
  const hasMissing = firewall.missing_sources.length > 0;
  const allowConnectedFallback = isIntegrationCoverageQuery(prompt) && !antiFallbackIntent;
  const fallbackIntent: FallbackIntent = firewall.intent === "smalltalk"
    ? "small_talk"
    : firewall.intent === "unsupported_domain" && allowConnectedFallback
      ? "unconnected_domain"
      : firewall.intent === "staffing" && firewall.missing_sources.includes("ROSTER") && allowConnectedFallback
        ? "unconnected_domain"
        : requiresConnected && hasMissing && allowConnectedFallback
          ? "unconnected_domain"
          : requiresConnected
            ? "no_match"
            : "missing_detail";
  if (fallbackIntent === "unconnected_domain" && !pendingWorkQuery) {
    routingPath = "connector_fallback";
  }
  trace.route = { ...trace.route, routing_path: routingPath };

  const fallback = buildFallbackResponse(fallbackIntent, connected, missing, firewall.signal_strength);

  const dataContext: Record<string, unknown> = {
    intent: firewall.intent,
    facts: firewall.facts,
    derived_metrics: firewall.derived_metrics,
    executed_tools: firewall.executed_tools,
    data_used: firewall.evidence,
    permitted_actions: firewall.permitted_actions,
    missing_sources: firewall.missing_sources,
    context: ctx,
  };
  const allowedFacts = buildAllowedFacts({
    selectedTools,
    evidence: firewall.evidence,
  });
  if (routingPath === "deep_reasoning") {
    debugStage = "verify";
  }
  trace.allowed_facts.ids = allowedFacts.ids;
  trace.constraints.push(`allowed_fact_count:${allowedFacts.ids.length}`);
  const ptlViewRead = firewall.evidence.some((item) => item.source === "view.read:operations.ptl");
  const ptlRows = ptlViewRead ? extractPtlRowsFromViewFacts(firewall.facts) : [];
  const waitingEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.access_pathways_waiting_list" ||
    item.source === "view.read:operations.waiting_list_management" ||
    item.source === "view.read:operations.waiting",
  );
  const waitingViewRead = Boolean(waitingEvidence);
  const waitingPage = waitingViewRead ? extractWaitingListPageFromViewFacts(firewall.facts) : null;
  const rttEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.access_pathways_rtt_monitoring" ||
    item.source === "view.read:operations.rtt",
  );
  const rttViewRead = Boolean(rttEvidence);
  const rttPage = rttViewRead ? extractRttPageFromViewFacts(firewall.facts) : null;
  const cancerEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.cancer_2ww" ||
    item.source === "view.read:operations.cancer",
  );
  const cancer2wwViewRead = Boolean(cancerEvidence);
  const cancer2wwPage = cancer2wwViewRead ? extractCancer2WWPageFromViewFacts(firewall.facts) : null;
  const referralEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.referral_management" ||
    item.source === "view.read:operations.referrals",
  );
  const referralsViewRead = Boolean(referralEvidence);
  const referralsPage = referralsViewRead ? extractReferralPageFromViewFacts(firewall.facts) : null;
  const triageEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.triage_status" ||
    item.source === "view.read:operations.triage",
  );
  const triageViewRead = Boolean(triageEvidence);
  const triagePage = triageViewRead ? extractTriagePageFromViewFacts(firewall.facts) : null;
  const breachEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.breach_tracking" ||
    item.source === "view.read:operations.breach",
  );
  const breachViewRead = Boolean(breachEvidence);
  const breachPage = breachViewRead ? extractBreachPageFromViewFacts(firewall.facts) : null;
  const milestonesEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.pathway_milestones" ||
    item.source === "view.read:operations.milestones",
  );
  const milestonesViewRead = Boolean(milestonesEvidence);
  const milestonesPage = milestonesViewRead ? extractMilestonesPageFromViewFacts(firewall.facts) : null;
  const clockEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.clock_starts_stops" ||
    item.source === "view.read:operations.clock",
  );
  const clockViewRead = Boolean(clockEvidence);
  const clockPage = clockViewRead ? extractClockEventsPageFromViewFacts(firewall.facts) : null;
  const dataQualityEvidence = firewall.evidence.find((item) =>
    item.source === "view.read:operations.validation_data_quality" ||
    item.source === "view.read:operations.validation",
  );
  const dataQualityViewRead = Boolean(dataQualityEvidence);
  const dataQualityPage = dataQualityViewRead ? extractDataQualityPageFromViewFacts(firewall.facts) : null;
  if (ptlViewRead) {
    trace.constraints.push(`ptl_rows:${ptlRows.length}`);
  }
  if (waitingViewRead && waitingPage) {
    trace.constraints.push(`waiting_list_rows:${waitingPage.rows.length}`);
    trace.constraints.push(`waiting_list_tiles:${waitingTilesCount(waitingPage)}`);
  }
  if (rttViewRead && rttPage) {
    trace.constraints.push(`rtt_rows:${rttPage.rows.length}`);
    trace.constraints.push(`rtt_tiles:${rttTilesCount(rttPage)}`);
  }
  if (cancer2wwViewRead && cancer2wwPage) {
    trace.constraints.push(`cancer_2ww_rows:${cancer2wwPage.rows.length}`);
    trace.constraints.push(`cancer_2ww_tiles:${cancer2wwTilesCount(cancer2wwPage)}`);
  }
  if (referralsViewRead && referralsPage) {
    trace.constraints.push(`referrals_rows:${referralsPage.rows.length}`);
    trace.constraints.push(`referrals_tiles:${referralTilesCount(referralsPage)}`);
  }
  if (triageViewRead && triagePage) {
    trace.constraints.push(`triage_rows:${triagePage.rows.length}`);
    trace.constraints.push(`triage_tiles:${triageTilesCount(triagePage)}`);
  }
  if (breachViewRead && breachPage) {
    trace.constraints.push(`breach_rows:${breachPage.rows.length}`);
    trace.constraints.push(`breach_tiles:${breachTilesCount(breachPage)}`);
  }
  if (milestonesViewRead && milestonesPage) {
    trace.constraints.push(`milestones_rows:${milestonesPage.rows.length}`);
  }
  if (clockViewRead && clockPage) {
    trace.constraints.push(`clock_rows:${clockPage.rows.length}`);
    trace.constraints.push(`clock_tiles:${clockTilesCount(clockPage)}`);
  }
  if (dataQualityViewRead && dataQualityPage) {
    trace.constraints.push(`data_quality_rows:${dataQualityPage.rows.length}`);
    trace.constraints.push(`data_quality_tiles:${dataQualityTilesCount(dataQualityPage)}`);
  }

  let deterministic: RichResponse = fallback;
  let explanationContext: Omit<ExplanationParams, "mode"> | null = null;
  let cancer2wwAnalyserHandled = false;
  if (cancer2wwViewRead && cancer2wwPage && isCancer2WWQuery(prompt)) {
    const sourceName = cancerEvidence?.source || "view.read:operations.cancer_2ww";
    const queryKind = detectCancer2WWQueryKind(prompt);
    const active = activeReferrals(cancer2wwPage);
    const safety = safetyEscalations(cancer2wwPage);
    const urgentDx = urgentDiagnosticsPending(cancer2wwPage);
    const breaches = cancerTotalBreaches(cancer2wwPage);
    const risks = highestRiskSpecialties(cancer2wwPage);
    const bullets = cancerSummaryBullets(cancer2wwPage);
    const asksBySpecialty = /\bby specialty\b/i.test(prompt) || /\bby speciality\b/i.test(prompt);
    const hasSpecialtyFilter = Boolean(cancer2wwPage.filters?.specialty);

    trace.constraints.push("cancer_2ww_analyser_used:true");
    cancer2wwAnalyserHandled = true;

    if (asksBySpecialty && !hasSpecialtyFilter) {
      deterministic = {
        title: "Cancer Pathways (2WW)",
        summary: "Which specialty should I focus on (or All)?",
        voice_summary: "Which specialty should I focus on (or All)?",
        sections: [{ heading: "Scope", body: "Cancer Pathways (2WW) is grouped by specialty.", bullets: ["Choose one specialty or All."] }],
        tables: [],
        next_actions: [
          { label: "All", rationale: "Use all specialties.", action_type: "ask", payload: { type: "clarify", kind: "missing_required_tool", choice: "specialty:all" } },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "cancer_2ww",
        finding_type: "scope_clarify",
        finding_data: {},
        evidence_summary: "Operations -> Cancer Pathways (2WW).",
        page_labels: ["Operations -> Cancer Pathways (2WW)"],
      };
    } else if (cancer2wwPage.rows.length === 0 && cancer2wwTilesCount(cancer2wwPage) === 0) {
      deterministic = {
        title: "Cancer Pathways (2WW)",
        summary: "Cancer Pathways (2WW) returned no data for the current filter.",
        voice_summary: "Cancer Pathways (2WW) returned no data for the current filter.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Cancer Pathways (2WW).", bullets: ["No rows and no tiles were returned."] }],
        tables: [],
        next_actions: [{ label: "Open Cancer Pathways (2WW)", rationale: "Inspect page directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=cancer", label: "Cancer Pathways (2WW)" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "No cancer 2WW payload data available." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "cancer_2ww",
        finding_type: "no_data",
        finding_data: {},
        evidence_summary: "Operations -> Cancer Pathways (2WW).",
        page_labels: ["Operations -> Cancer Pathways (2WW)"],
      };
    } else if (queryKind === "safety_escalations") {
      deterministic = {
        title: "Cancer Pathways (2WW)",
        summary: safety !== null ? `Safety escalations currently shown: ${safety}.` : "Safety escalations are not shown in the current payload.",
        voice_summary: safety !== null ? `Safety escalations currently shown: ${safety}.` : "Safety escalations are not shown in the current payload.",
        sections: [{ heading: "Key signals", body: "Checked: Operations -> Cancer Pathways (2WW).", bullets }],
        tables: [],
        next_actions: [{ label: "Open Cancer Pathways (2WW)", rationale: "Review specialty rows.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=cancer", label: "Cancer Pathways (2WW)" } }],
        context_cards: [],
        data_used: [...firewall.evidence, ...(safety !== null ? [{ source: sourceName, label: "Safety escalations", value: safety }] : [])],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "cancer_2ww",
        finding_type: "safety_escalations",
        finding_data: { active_referrals: active, total_breaches: breaches, urgent_diagnostics_pending: urgentDx, safety_escalations: safety },
        evidence_summary: "Operations -> Cancer Pathways (2WW).",
        page_labels: ["Operations -> Cancer Pathways (2WW)"],
      };
    } else {
      deterministic = {
        title: "Cancer Pathways (2WW)",
        summary: bullets.length > 0 ? `${bullets.join(". ")}.` : "Cancer Pathways (2WW) signals are available from current payload.",
        voice_summary: bullets.length > 0 ? `${bullets.join(". ")}.` : "Cancer Pathways (2WW) signals are available from current payload.",
        sections: [{
          heading: "Key signals",
          body: "Checked: Operations -> Cancer Pathways (2WW).",
          bullets: [
            ...bullets,
            ...(risks.length > 0 ? [`Highest-risk specialties: ${risks.map((risk) => `${risk.specialty} (${risk.reason})`).join(", ")}`] : []),
          ].slice(0, 3),
        }],
        tables: [],
        next_actions: [{ label: "Open Cancer Pathways (2WW)", rationale: "Review specialty-level rows.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=cancer", label: "Cancer Pathways (2WW)" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "cancer_2ww",
        finding_type: queryKind,
        finding_data: { active_referrals: active, total_breaches: breaches, urgent_diagnostics_pending: urgentDx, safety_escalations: safety },
        evidence_summary: "Operations -> Cancer Pathways (2WW).",
        page_labels: ["Operations -> Cancer Pathways (2WW)"],
      };
    }
  }
  let referralsAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && referralsViewRead && referralsPage && isReferralQuery(prompt)) {
    const sourceName = referralEvidence?.source || "view.read:operations.referral_management";
    const queryKind = detectReferralQueryKind(prompt);
    const counts = pipelineCounts(referralsPage);
    const longest = longestWaitingReferral(referralsPage);
    const bySpecialty = referralsBySpecialty(referralsPage);
    const bullets = referralSummaryBullets(referralsPage);
    const asksBySpecialty = /\bby specialty\b/i.test(prompt) || /\bby speciality\b/i.test(prompt);
    const hasSpecialtyFilter = Boolean(referralsPage.filters?.specialty);
    trace.constraints.push("referrals_analyser_used:true");
    referralsAnalyserHandled = true;

    if (asksBySpecialty && !hasSpecialtyFilter) {
      deterministic = {
        title: "Referral Management",
        summary: "Which specialty should I focus on (or All)?",
        voice_summary: "Which specialty should I focus on (or All)?",
        sections: [{ heading: "Scope", body: "Referral Management is grouped by referral rows.", bullets: ["Choose one specialty or All."] }],
        tables: [],
        next_actions: [{ label: "All", rationale: "Use all specialties.", action_type: "ask", payload: { type: "clarify", kind: "missing_required_tool", choice: "specialty:all" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "referrals",
        finding_type: "scope_clarify",
        finding_data: {},
        evidence_summary: "Operations -> Referral Management.",
        page_labels: ["Operations -> Referral Management"],
      };
    } else if (referralsPage.rows.length === 0 && referralTilesCount(referralsPage) === 0) {
      deterministic = {
        title: "Referral Management",
        summary: "Referral Management returned no data for the current filter.",
        voice_summary: "Referral Management returned no data for the current filter.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Referral Management.", bullets: ["No rows and no tiles were returned."] }],
        tables: [],
        next_actions: [{ label: "Open Referral Management", rationale: "Inspect page directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=referrals", label: "Referral Management" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "No referral payload data available." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "referrals",
        finding_type: "no_data",
        finding_data: {},
        evidence_summary: "Operations -> Referral Management.",
        page_labels: ["Operations -> Referral Management"],
      };
    } else {
      const summary = queryKind === "overdue_triage" && counts.overdue_triage !== undefined
        ? `Overdue triage currently shown: ${counts.overdue_triage}.`
        : queryKind === "awaiting_triage" && counts.awaiting_triage !== undefined
          ? `Awaiting triage currently shown: ${counts.awaiting_triage}.`
          : queryKind === "new_referrals" && counts.new_referrals !== undefined
            ? `New referrals currently shown: ${counts.new_referrals}.`
            : queryKind === "conversion_rate" && counts.conversion_rate !== undefined
              ? `Referral conversion rate currently shown: ${counts.conversion_rate}.`
              : queryKind === "longest_waiting" && longest
                ? `${longest.patient_name} is waiting longest at ${longest.waiting_days} days (${longest.specialty}).`
                : bullets.length > 0
                  ? `${bullets.join(". ")}.`
                  : "Referral Management signals are available from current payload.";
      deterministic = {
        title: "Referral Management",
        summary,
        voice_summary: summary,
        sections: [{
          heading: "Key signals",
          body: "Checked: Operations -> Referral Management.",
          bullets: [
            ...bullets,
            ...(bySpecialty.length > 0 ? [`Top specialty volume: ${bySpecialty[0].specialty} (${bySpecialty[0].count})`] : []),
          ].slice(0, 3),
        }],
        tables: [],
        next_actions: [{ label: "Open Referral Management", rationale: "Review referral rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=referrals", label: "Referral Management" } }],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          ...(counts.overdue_triage !== undefined ? [{ source: sourceName, label: "Overdue triage", value: counts.overdue_triage }] : []),
          ...(counts.new_referrals !== undefined ? [{ source: sourceName, label: "New referrals", value: counts.new_referrals }] : []),
          ...(counts.awaiting_triage !== undefined ? [{ source: sourceName, label: "Awaiting triage", value: counts.awaiting_triage }] : []),
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "referrals",
        finding_type: queryKind,
        finding_data: {
          new_referrals: counts.new_referrals,
          awaiting_triage: counts.awaiting_triage,
          overdue_triage: counts.overdue_triage,
          rejected_referrals: counts.rejected_referrals,
          conversion_rate: counts.conversion_rate,
          longest_patient: longest?.patient_name,
          longest_waiting_days: longest?.waiting_days,
        },
        evidence_summary: "Operations -> Referral Management.",
        page_labels: ["Operations -> Referral Management"],
      };
    }
  }
  let dataQualityAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && dataQualityViewRead && dataQualityPage && isDataQualityQuery(prompt)) {
    const sourceName = dataQualityEvidence?.source || "view.read:operations.validation_data_quality";
    const queryKind = detectDataQualityQueryKind(prompt);
    const counts = issueCounts(dataQualityPage);
    const totalRows = totalIssueRows(dataQualityPage);
    const unassigned = unassignedRecords(dataQualityPage);
    const recent = mostRecentIssues(dataQualityPage, 3);
    const bullets = dataQualitySummaryBullets(dataQualityPage);

    trace.constraints.push("data_quality_analyser_used:true");
    dataQualityAnalyserHandled = true;

    if (dataQualityPage.rows.length === 0 && dataQualityTilesCount(dataQualityPage) === 0) {
      deterministic = {
        title: "Validation & Data Quality",
        summary: "Validation & Data Quality returned no issues for the current filter.",
        voice_summary: "Validation & Data Quality returned no issues for the current filter.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Validation & Data Quality.", bullets: ["No issue rows and no issue tiles were returned."] }],
        tables: [],
        next_actions: [{ label: "Open Validation & Data Quality", rationale: "Inspect page directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=validation", label: "Validation & Data Quality" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "No data-quality issues in current payload." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "data_quality",
        finding_type: "no_data",
        finding_data: {},
        evidence_summary: "Operations -> Validation & Data Quality.",
        page_labels: ["Operations -> Validation & Data Quality"],
      };
    } else if (queryKind === "no_owner") {
      const summary = unassigned.length > 0
        ? `Records with no owner shown: ${unassigned.map((row) => row.patient_name).slice(0, 3).join(", ")}.`
        : "No unassigned owners are shown in the current issue rows.";
      deterministic = {
        title: "Validation & Data Quality",
        summary,
        voice_summary: summary,
        sections: [{ heading: "Governance signals", body: "Checked: Operations -> Validation & Data Quality.", bullets }],
        tables: [],
        next_actions: [{ label: "Open Validation & Data Quality", rationale: "Review issue rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=validation", label: "Validation & Data Quality" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "data_quality",
        finding_type: "no_owner",
        finding_data: {
          no_owner_assigned: counts.no_owner_assigned,
          total_rows: totalRows,
        },
        evidence_summary: "Operations -> Validation & Data Quality.",
        page_labels: ["Operations -> Validation & Data Quality"],
      };
    } else {
      const summary = queryKind === "duplicate_nhs" && counts.duplicate_nhs_numbers !== undefined
        ? `Duplicate NHS numbers currently shown: ${counts.duplicate_nhs_numbers}.`
        : queryKind === "validation_overdue" && counts.validation_overdue !== undefined
          ? `Validation overdue currently shown: ${counts.validation_overdue}.`
          : queryKind === "ghost_pathways" && counts.ghost_pathways !== undefined
            ? `Ghost pathways currently shown: ${counts.ghost_pathways}.`
            : `Data-quality issues currently shown: ${totalRows} rows.`;
      deterministic = {
        title: "Validation & Data Quality",
        summary,
        voice_summary: summary,
        sections: [{
          heading: "Governance and integrity signals",
          body: "Checked: Operations -> Validation & Data Quality.",
          bullets: [
            ...bullets,
            ...(recent[0] ? [`Most recent issue row: ${recent[0].patient_name} - ${recent[0].issue}`] : []),
          ].slice(0, 4),
        }],
        tables: [],
        next_actions: [{ label: "Open Validation & Data Quality", rationale: "Review issue rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=validation", label: "Validation & Data Quality" } }],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          ...(counts.validation_overdue !== undefined ? [{ source: sourceName, label: "Validation overdue", value: counts.validation_overdue }] : []),
          ...(counts.never_validated !== undefined ? [{ source: sourceName, label: "Never validated", value: counts.never_validated }] : []),
          ...(counts.no_owner_assigned !== undefined ? [{ source: sourceName, label: "No owner assigned", value: counts.no_owner_assigned }] : []),
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "data_quality",
        finding_type: queryKind,
        finding_data: {
          validation_overdue: counts.validation_overdue,
          never_validated: counts.never_validated,
          no_owner_assigned: counts.no_owner_assigned,
          duplicate_nhs_numbers: counts.duplicate_nhs_numbers,
          missing_mandatory_fields: counts.missing_mandatory_fields,
          no_recent_contact: counts.no_recent_contact,
          ghost_pathways: counts.ghost_pathways,
          total_rows: totalRows,
          most_recent_patient: recent[0]?.patient_name,
          most_recent_issue: recent[0]?.issue,
        },
        evidence_summary: "Operations -> Validation & Data Quality.",
        page_labels: ["Operations -> Validation & Data Quality"],
      };
    }
  }

  let clockAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && !dataQualityAnalyserHandled && clockViewRead && clockPage && isClockEventsQuery(prompt)) {
    const sourceName = clockEvidence?.source || "view.read:operations.clock_starts_stops";
    const queryKind = detectClockEventsQueryKind(prompt);
    const counts = anomalyCounts(clockPage);
    const totalRows = totalAnomalyRows(clockPage);
    const recent = mostRecentAnomalies(clockPage, 3);
    const bullets = clockSummaryBullets(clockPage);
    const missingClockStarts = clockPage.rows.filter((row) => row.issue.toLowerCase().includes("missing clock start"));

    trace.constraints.push("clock_analyser_used:true");
    clockAnalyserHandled = true;

    if (clockPage.rows.length === 0 && clockTilesCount(clockPage) === 0) {
      deterministic = {
        title: "Clock Starts/Stops",
        summary: "Clock Starts/Stops returned no anomalies for the current filter.",
        voice_summary: "Clock Starts/Stops returned no anomalies for the current filter.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Clock Starts/Stops.", bullets: ["No anomaly rows and no anomaly tiles were returned."] }],
        tables: [],
        next_actions: [{ label: "Open Clock Starts/Stops", rationale: "Inspect page directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=clock", label: "Clock Starts/Stops" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "No clock-event anomalies in current payload." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "clock_events",
        finding_type: "no_data",
        finding_data: {},
        evidence_summary: "Operations -> Clock Starts/Stops.",
        page_labels: ["Operations -> Clock Starts/Stops"],
      };
    } else if (queryKind === "missing_clock_start") {
      const summary = missingClockStarts.length > 0
        ? `Missing clock start cases shown: ${missingClockStarts.map((row) => row.patient_name).slice(0, 3).join(", ")}.`
        : "No row-level missing clock start issues are shown in the current payload.";
      deterministic = {
        title: "Clock Starts/Stops",
        summary,
        voice_summary: summary,
        sections: [{ heading: "Clock integrity signals", body: "Checked: Operations -> Clock Starts/Stops.", bullets }],
        tables: [],
        next_actions: [{ label: "Open Clock Starts/Stops", rationale: "Review anomaly rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=clock", label: "Clock Starts/Stops" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "clock_events",
        finding_type: "missing_clock_start",
        finding_data: {
          clock_start_anomalies: counts.clock_start_anomalies,
          total_rows: totalRows,
        },
        evidence_summary: "Operations -> Clock Starts/Stops.",
        page_labels: ["Operations -> Clock Starts/Stops"],
      };
    } else {
      const summary = queryKind === "manual_overrides" && counts.manual_overrides !== undefined
        ? `Manual overrides currently shown: ${counts.manual_overrides}.`
        : queryKind === "duplicate_clocks" && counts.duplicate_clocks !== undefined
          ? `Duplicate clocks currently shown: ${counts.duplicate_clocks}.`
          : queryKind === "suspended" && counts.suspended_clocks !== undefined
            ? `Suspended clocks currently shown: ${counts.suspended_clocks}.`
            : `Clock event anomalies currently shown: ${totalRows} rows.`;
      deterministic = {
        title: "Clock Starts/Stops",
        summary,
        voice_summary: summary,
        sections: [{
          heading: "Audit and integrity signals",
          body: "Checked: Operations -> Clock Starts/Stops.",
          bullets: [
            ...bullets,
            ...(recent[0] ? [`Most recent anomaly row: ${recent[0].patient_name} - ${recent[0].issue}`] : []),
          ].slice(0, 4),
        }],
        tables: [],
        next_actions: [{ label: "Open Clock Starts/Stops", rationale: "Review anomaly rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=clock", label: "Clock Starts/Stops" } }],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          ...(counts.clock_start_anomalies !== undefined ? [{ source: sourceName, label: "Clock start anomalies", value: counts.clock_start_anomalies }] : []),
          ...(counts.manual_overrides !== undefined ? [{ source: sourceName, label: "Manual overrides", value: counts.manual_overrides }] : []),
          ...(counts.duplicate_clocks !== undefined ? [{ source: sourceName, label: "Duplicate clocks", value: counts.duplicate_clocks }] : []),
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "clock_events",
        finding_type: queryKind,
        finding_data: {
          clock_start_anomalies: counts.clock_start_anomalies,
          suspended_clocks: counts.suspended_clocks,
          duplicate_clocks: counts.duplicate_clocks,
          manual_overrides: counts.manual_overrides,
          total_rows: totalRows,
          most_recent_patient: recent[0]?.patient_name,
          most_recent_issue: recent[0]?.issue,
        },
        evidence_summary: "Operations -> Clock Starts/Stops.",
        page_labels: ["Operations -> Clock Starts/Stops"],
      };
    }
  }
  let milestonesAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && !dataQualityAnalyserHandled && !clockAnalyserHandled && milestonesViewRead && milestonesPage && isMilestonesQuery(prompt)) {
    const queryKind = detectMilestonesQueryKind(prompt);
    const longest = longestStage(milestonesPage);
    const bottlenecks = bottleneckStages(milestonesPage);
    const distribution = stageDistribution(milestonesPage);
    const bullets = milestonesSummaryBullets(milestonesPage);

    trace.constraints.push("milestones_analyser_used:true");
    milestonesAnalyserHandled = true;

    if (milestonesPage.rows.length === 0) {
      deterministic = {
        title: "Pathway Milestones",
        summary: "Pathway Milestones returned no stage data for the current filter.",
        voice_summary: "Pathway Milestones returned no stage data for the current filter.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Pathway Milestones.", bullets: ["No stage rows were returned."] }],
        tables: [],
        next_actions: [{ label: "Open Pathway Milestones", rationale: "Inspect page directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=milestones", label: "Pathway Milestones" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "No pathway milestones rows in current payload." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "pathway_milestones",
        finding_type: "no_data",
        finding_data: {},
        evidence_summary: "Operations -> Pathway Milestones.",
        page_labels: ["Operations -> Pathway Milestones"],
      };
    } else {
      const summary = queryKind === "bottleneck" && bottlenecks[0]
        ? `Current bottleneck stage is ${bottlenecks[0].stage} at ${bottlenecks[0].avg_wait_days} days average wait.`
        : queryKind === "longest_stage" && longest
          ? `Longest stage delay is ${longest.stage} at ${longest.avg_wait_days} days average.`
          : `Pathway flow shows the longest stage at ${longest?.stage ?? "unknown"} with ${longest?.avg_wait_days ?? 0} days average wait.`;
      deterministic = {
        title: "Pathway Milestones",
        summary,
        voice_summary: summary,
        sections: [{
          heading: "Flow signals",
          body: "Checked: Operations -> Pathway Milestones.",
          bullets,
        }],
        tables: [],
        next_actions: [{ label: "Open Pathway Milestones", rationale: "Review stage rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=milestones", label: "Pathway Milestones" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "pathway_milestones",
        finding_type: queryKind,
        finding_data: {
          longest_stage: longest?.stage,
          longest_avg_wait_days: longest?.avg_wait_days,
          highest_volume_stage: distribution[0]?.stage,
          highest_volume_count: distribution[0]?.count,
          next_longest_stage: bottlenecks[1]?.stage,
          next_longest_avg_wait_days: bottlenecks[1]?.avg_wait_days,
        },
        evidence_summary: "Operations -> Pathway Milestones.",
        page_labels: ["Operations -> Pathway Milestones"],
      };
    }
  }
  let breachAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && !dataQualityAnalyserHandled && !clockAnalyserHandled && !milestonesAnalyserHandled && breachViewRead && breachPage && isBreachTrackingQuery(prompt)) {
    const sourceName = breachEvidence?.source || "view.read:operations.breach_tracking";
    const queryKind = detectBreachQueryKind(prompt);
    const total = totalBreachCount(breachPage);
    const longest = longestBreach(breachPage);
    const bySpecialty = breachesBySpecialty(breachPage);
    const byCause = breachesByCause(breachPage);
    const unassigned = unassignedBreaches(breachPage);
    const bullets = breachSummaryBullets(breachPage);

    trace.constraints.push("breach_analyser_used:true");
    breachAnalyserHandled = true;

    if (breachPage.rows.length === 0) {
      deterministic = {
        title: "Breach Tracking",
        summary: "No breach cases returned for the current filter.",
        voice_summary: "No breach cases returned for the current filter.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Breach Tracking.", bullets: ["No breach rows were returned."] }],
        tables: [],
        next_actions: [{ label: "Open Breach Tracking", rationale: "Inspect page directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=breach", label: "Breach Tracking" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "No breach cases in current payload." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "breach_tracking",
        finding_type: "no_data",
        finding_data: {},
        evidence_summary: "Operations -> Breach Tracking.",
        page_labels: ["Operations -> Breach Tracking"],
      };
    } else {
      const summary = queryKind === "who" && longest
        ? `${longest.patient_name} is breaching the longest at ${longest.waiting_days} days (${longest.specialty}).`
        : queryKind === "repeat" && typeof breachPage.tiles.repeat_breach_cases === "number"
          ? `Repeat breach cases currently shown: ${breachPage.tiles.repeat_breach_cases}.`
          : queryKind === "causes" && byCause.length > 0
            ? `Listed breach causes: ${byCause.map((item) => `${item.cause} (${item.count})`).slice(0, 3).join(", ")}.`
            : queryKind === "ownership"
              ? `Unassigned breaches currently shown: ${unassigned.length}.`
              : queryKind === "trend" && typeof breachPage.tiles.weekly_trend === "number"
                ? `Weekly breach trend currently shown: ${breachPage.tiles.weekly_trend}.`
                : `Total breaches currently shown: ${total}.`;
      deterministic = {
        title: "Breach Tracking",
        summary,
        voice_summary: summary,
        sections: [{
          heading: "Key signals",
          body: "Checked: Operations -> Breach Tracking.",
          bullets: [
            ...bullets,
            ...(bySpecialty.length > 0 ? [`Top specialty breaches: ${bySpecialty[0].specialty} (${bySpecialty[0].count})`] : []),
          ].slice(0, 4),
        }],
        tables: [],
        next_actions: [{ label: "Open Breach Tracking", rationale: "Review breach rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=breach", label: "Breach Tracking" } }],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          { source: sourceName, label: "Total breaches", value: total },
          ...(typeof breachPage.tiles.repeat_breach_cases === "number" ? [{ source: sourceName, label: "Repeat breach cases", value: breachPage.tiles.repeat_breach_cases }] : []),
          ...(typeof breachPage.tiles.weekly_trend === "number" ? [{ source: sourceName, label: "Weekly trend", value: breachPage.tiles.weekly_trend }] : []),
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "breach_tracking",
        finding_type: queryKind,
        finding_data: {
          total_breaches: total,
          longest_patient: longest?.patient_name,
          longest_waiting_days: longest?.waiting_days,
          repeat_breach_cases: breachPage.tiles.repeat_breach_cases,
          weekly_trend: breachPage.tiles.weekly_trend,
          unassigned_breaches: unassigned.length,
          top_cause: byCause[0]?.cause,
        },
        evidence_summary: "Operations -> Breach Tracking.",
        page_labels: ["Operations -> Breach Tracking"],
      };
    }
  }
  let triageAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && !dataQualityAnalyserHandled && !clockAnalyserHandled && !breachAnalyserHandled && triageViewRead && triagePage && isTriageQuery(prompt)) {
    const sourceName = triageEvidence?.source || "view.read:operations.triage_status";
    const queryKind = detectTriageQueryKind(prompt);
    const counts = queueCounts(triagePage);
    const oldest = longestWaiting(triagePage);
    const urgent = urgentItems(triagePage);
    const atRisk = atRiskItems(triagePage);
    const bullets = triageSummaryBullets(triagePage);
    const asksBySpecialty = /\bby specialty\b/i.test(prompt) || /\bby speciality\b/i.test(prompt);
    const hasSpecialtyFilter = Boolean(triagePage.filters?.specialty);

    trace.constraints.push("triage_analyser_used:true");
    triageAnalyserHandled = true;

    if (asksBySpecialty && !hasSpecialtyFilter) {
      deterministic = {
        title: "Triage Status",
        summary: "Which specialty should I focus on (or All)?",
        voice_summary: "Which specialty should I focus on (or All)?",
        sections: [{ heading: "Scope", body: "Triage Status can be filtered by specialty.", bullets: ["Choose one specialty or All."] }],
        tables: [],
        next_actions: [{ label: "All", rationale: "Use all specialties.", action_type: "ask", payload: { type: "clarify", kind: "missing_required_tool", choice: "specialty:all" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "triage",
        finding_type: "scope_clarify",
        finding_data: {},
        evidence_summary: "Operations -> Triage Status.",
        page_labels: ["Operations -> Triage Status"],
      };
    } else if (triagePage.rows.length === 0 && triageTilesCount(triagePage) === 0) {
      deterministic = {
        title: "Triage Status",
        summary: "Triage Status returned no data for the current filter.",
        voice_summary: "Triage Status returned no data for the current filter.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Triage Status.", bullets: ["No rows and no tiles were returned."] }],
        tables: [],
        next_actions: [{ label: "Open Triage Status", rationale: "Inspect page directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=triage", label: "Triage Status" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "No triage payload data available." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "triage",
        finding_type: "no_data",
        finding_data: {},
        evidence_summary: "Operations -> Triage Status.",
        page_labels: ["Operations -> Triage Status"],
      };
    } else if (queryKind === "who_overdue" && triagePage.rows.length > 0 && !triagePage.rows.some((row) => typeof row.state === "string" && row.state.length > 0)) {
      deterministic = {
        title: "Triage Status",
        summary: "This page shows totals by state, but row-level state is not present in the payload.",
        voice_summary: "This page shows totals by state, but row-level state is not present in the payload.",
        sections: [{ heading: "What I checked", body: "Checked: Operations -> Triage Status.", bullets: ["I can still report queue totals from tiles."] }],
        tables: [],
        next_actions: [{ label: "Open Triage Status", rationale: "Review queue directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=triage", label: "Triage Status" } }],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "triage",
        finding_type: "row_state_missing",
        finding_data: {
          awaiting_consultant_review: counts.awaiting_consultant_review,
          overdue_triage: counts.overdue_triage,
        },
        evidence_summary: "Operations -> Triage Status.",
        page_labels: ["Operations -> Triage Status"],
      };
    } else {
      const summary = queryKind === "overdue" && counts.overdue_triage !== undefined
        ? `Overdue triage currently shown: ${counts.overdue_triage}.`
        : queryKind === "awaiting_review" && counts.awaiting_consultant_review !== undefined
          ? `Awaiting consultant review currently shown: ${counts.awaiting_consultant_review}.`
          : queryKind === "clarification_requested" && counts.clarification_requested !== undefined
            ? `Clarification requested currently shown: ${counts.clarification_requested}.`
            : queryKind === "reprioritization" && counts.reprioritization_pending !== undefined
              ? `Reprioritization pending currently shown: ${counts.reprioritization_pending}.`
              : queryKind === "longest_waiting" && oldest
                ? `${oldest.patient_name} is the oldest pending triage item at ${oldest.waiting_days} days.`
                : bullets.length > 0
                  ? `${bullets.join(". ")}.`
                  : "Triage queue signals are available from the current payload.";
      deterministic = {
        title: "Triage Status",
        summary,
        voice_summary: summary,
        sections: [{
          heading: "Key signals",
          body: "Checked: Operations -> Triage Status.",
          bullets: [
            ...bullets,
            ...(urgent.length > 0 ? [`Urgent triage items: ${urgent.length}`] : []),
            ...(atRisk.length > 0 ? [`At-risk triage items: ${atRisk.length}`] : []),
          ].slice(0, 3),
        }],
        tables: [],
        next_actions: [{ label: "Open Triage Status", rationale: "Review triage queue rows directly.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=triage", label: "Triage Status" } }],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          ...(counts.awaiting_consultant_review !== undefined ? [{ source: sourceName, label: "Awaiting consultant review", value: counts.awaiting_consultant_review }] : []),
          ...(counts.overdue_triage !== undefined ? [{ source: sourceName, label: "Overdue triage", value: counts.overdue_triage }] : []),
          ...(counts.clarification_requested !== undefined ? [{ source: sourceName, label: "Clarification requested", value: counts.clarification_requested }] : []),
          ...(counts.reprioritization_pending !== undefined ? [{ source: sourceName, label: "Reprioritization pending", value: counts.reprioritization_pending }] : []),
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "triage",
        finding_type: queryKind,
        finding_data: {
          awaiting_consultant_review: counts.awaiting_consultant_review,
          overdue_triage: counts.overdue_triage,
          clarification_requested: counts.clarification_requested,
          reprioritization_pending: counts.reprioritization_pending,
          oldest_patient: oldest?.patient_name,
          oldest_waiting_days: oldest?.waiting_days,
        },
        evidence_summary: "Operations -> Triage Status.",
        page_labels: ["Operations -> Triage Status"],
      };
    }
  }
  let rttAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && !dataQualityAnalyserHandled && !clockAnalyserHandled && !milestonesAnalyserHandled && !breachAnalyserHandled && !triageAnalyserHandled && rttViewRead && rttPage && isRttComplianceQuestion(prompt)) {
    const sourceName = rttEvidence?.source || "view.read:operations.access_pathways_rtt_monitoring";
    const compliance = overallCompliance(rttPage);
    const lowestCompliance = specialtyWithLowestCompliance(rttPage);
    const mostBreaches = specialtyWithMostBreaches(rttPage);
    const below50 = specialtiesBelowThreshold(rttPage, 50);
    const summaryLines = complianceSummary(rttPage);
    const text = prompt.toLowerCase();
    const asksCompliance = text.includes("compliant") || text.includes("compliance") || text.includes("within 18") || text.includes("18 week");
    const asksBreaches = text.includes("breach") || text.includes("52 week") || text.includes("52-week");

    trace.constraints.push("rtt_analyser_used:true");
    rttAnalyserHandled = true;

    if (rttPage.rows.length === 0 && compliance === null) {
      deterministic = {
        title: "RTT Monitoring",
        summary: "RTT Monitoring returned no rows for the current filter.",
        voice_summary: "RTT Monitoring returned no rows for the current filter.",
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> RTT Monitoring",
            bullets: ["No specialty rows were returned for this filter scope."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open RTT Monitoring page",
            rationale: "Inspect RTT view directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=rtt", label: "RTT Monitoring" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "RTT page was read but returned no rows." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "rtt",
        finding_type: "no_rows",
        finding_data: {},
        evidence_summary: "Operations -> RTT Monitoring tiles and specialty compliance rows.",
      };
    } else if (asksCompliance && compliance !== null) {
      deterministic = {
        title: "RTT compliance",
        summary: `Overall RTT compliance within 18 weeks is ${compliance}%.`,
        voice_summary: `Overall RTT compliance within 18 weeks is ${compliance}%.`,
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> RTT Monitoring",
            bullets: [
              `Within 18 weeks: ${compliance}%`,
              ...(lowestCompliance ? [`Lowest specialty compliance: ${lowestCompliance.specialty} (${lowestCompliance.percent_within_18w}%)`] : []),
              ...(below50.length > 0 ? [`Specialties below 50%: ${below50.map((item) => item.specialty).join(", ")}`] : []),
            ],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open RTT Monitoring page",
            rationale: "Review RTT specialty rows directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=rtt", label: "RTT Monitoring" },
          },
        ],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          { source: sourceName, label: "Within 18 weeks", value: compliance },
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "rtt",
        finding_type: "compliance",
        finding_data: {
          percent_within_18w: compliance,
          specialty: lowestCompliance?.specialty,
          forecast_breaches: rttPage.tiles.forecast_breaches,
        },
        evidence_summary: "Operations -> RTT Monitoring tiles and specialty compliance rows.",
      };
    } else if (asksBreaches) {
      deterministic = {
        title: "RTT breaches",
        summary: mostBreaches
          ? `Highest 52-week breaches are in ${mostBreaches.specialty} (${mostBreaches.breaches_52w}).`
          : "No 52-week breach rows are shown in the current RTT payload.",
        voice_summary: mostBreaches
          ? `Highest 52-week breaches are in ${mostBreaches.specialty} (${mostBreaches.breaches_52w}).`
          : "No 52-week breach rows are shown in the current RTT payload.",
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> RTT Monitoring",
            bullets: mostBreaches
              ? [
                `Top specialty for 52-week breaches: ${mostBreaches.specialty}`,
                `52-week breaches: ${mostBreaches.breaches_52w}`,
                ...(lowestCompliance ? [`Lowest compliance specialty: ${lowestCompliance.specialty} (${lowestCompliance.percent_within_18w}%)`] : []),
              ]
              : ["No positive 52-week breach counts were found in specialty rows."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open RTT Monitoring page",
            rationale: "Inspect RTT breaches by specialty.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=rtt", label: "RTT Monitoring" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "rtt",
        finding_type: "breaches_52w",
        finding_data: {
          specialty: mostBreaches?.specialty,
          breaches_52w: mostBreaches?.breaches_52w,
          percent_within_18w: compliance,
        },
        evidence_summary: "Operations -> RTT Monitoring tiles and specialty compliance rows.",
      };
    } else {
      const summary = summaryLines.length > 0 ? summaryLines[0] : "RTT Monitoring loaded for compliance review.";
      deterministic = {
        title: "RTT monitoring summary",
        summary,
        voice_summary: summary,
        sections: [
          {
            heading: "Top signals",
            body: "Derived from RTT tiles and specialty compliance rows.",
            bullets: summaryLines.length > 0 ? summaryLines : ["No RTT summary metrics were available in this payload."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open RTT Monitoring page",
            rationale: "Review RTT specialty compliance directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=rtt", label: "RTT Monitoring" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "rtt",
        finding_type: "summary",
        finding_data: {
          percent_within_18w: compliance,
          specialty: mostBreaches?.specialty,
          breaches_52w: mostBreaches?.breaches_52w,
          forecast_breaches: rttPage.tiles.forecast_breaches,
        },
        evidence_summary: "Operations -> RTT Monitoring tiles and specialty compliance rows.",
      };
    }
  }
  let waitingAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && !dataQualityAnalyserHandled && !clockAnalyserHandled && !milestonesAnalyserHandled && !breachAnalyserHandled && !triageAnalyserHandled && !rttAnalyserHandled && waitingViewRead && waitingPage && isWaitingListMacroQuestion(prompt)) {
    const queryKind = detectWaitingListQueryKind(prompt);
    const waitTotal = totalWaiting(waitingPage);
    const maxAvgWait = specialtyWithMaxAvgWait(waitingPage);
    const maxWaiting = specialtyWithMaxWaiting(waitingPage);
    const capacityGaps = specialtiesWithCapacityGap(waitingPage);
    const sourceName = waitingEvidence?.source || "view.read:operations.access_pathways_waiting_list";
    const specialtyNames = waitingPage.rows.map((row) => row.specialty).filter(Boolean);
    const asksSpecialtyScoped = queryKind === "max_avg_wait" || queryKind === "max_waiting_volume" || /\bspecialty\b/i.test(prompt);
    const hasSpecialtyFilter = Boolean(waitingPage.filters?.specialty);
    const isHowManyWaitingQuestion = queryKind === "total_waiting";

    trace.constraints.push("waiting_list_analyser_used:true");
    waitingAnalyserHandled = true;

    if (
      isHowManyWaitingQuestion &&
      ptlViewRead &&
      ptlRows.length > 0 &&
      (waitTotal !== null || waitingPage.rows.length > 0)
    ) {
      deterministic = {
        title: "Quick clarification",
        summary: "Do you mean total patients on the waiting list (macro) or patient-level PTL list (micro)?",
        voice_summary: "Do you mean total patients on the waiting list (macro) or patient-level PTL list (micro)?",
        sections: [
          {
            heading: "Two valid sources",
            body: "I can answer from either aggregated waiting-list management data or PTL patient rows.",
            bullets: [
              "Waiting List Management (macro): specialty-level totals and gaps.",
              "PTL (micro): patient-level tracking list.",
            ],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Waiting List Management (macro)",
            rationale: "Use aggregated specialty-level totals.",
            action_type: "ask",
            payload: { type: "clarify", kind: "missing_required_tool", choice: "waiting_list_macro" },
          },
          {
            label: "PTL (patient list)",
            rationale: "Use patient-level PTL rows.",
            action_type: "ask",
            payload: { type: "clarify", kind: "missing_required_tool", choice: "ptl_micro" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
    } else if (asksSpecialtyScoped && !hasSpecialtyFilter) {
      deterministic = {
        title: "Specialty focus",
        summary: "Which specialty should I focus on (or 'All')?",
        voice_summary: "Which specialty should I focus on (or 'All')?",
        sections: [
          {
            heading: "Waiting list scope",
            body: "The waiting list dashboard is grouped by specialty.",
            bullets: [
              "Choose one specialty for a focused answer.",
              "Or choose All to compare across specialties.",
            ],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "All",
            rationale: "Use all specialties in the current waiting list view.",
            action_type: "ask",
            payload: { type: "clarify", kind: "missing_required_tool", choice: "specialty:all" },
          },
          ...specialtyNames.slice(0, 4).map((name) => ({
            label: name,
            rationale: "Filter waiting list analysis to this specialty.",
            action_type: "ask" as const,
            payload: { type: "clarify", kind: "missing_required_tool", choice: `specialty:${name}` },
          })),
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
    } else if (waitTotal === null && waitingPage.rows.length === 0) {
      deterministic = {
        title: "Waiting list page",
        summary: "The waiting list page returned no rows.",
        voice_summary: "The waiting list page returned no rows.",
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> Waiting List Management",
            bullets: ["No grouped specialty rows were available in the waiting list payload."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Inspect waiting list view directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "Waiting list page was read but returned no rows." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "waiting_list",
        finding_type: "no_rows",
        finding_data: {},
        evidence_summary: "Operations -> Waiting List Management grouped specialty rows and tiles.",
      };
    } else if (queryKind === "max_avg_wait" && maxAvgWait) {
      deterministic = {
        title: "Longest average wait by specialty",
        summary: `${maxAvgWait.specialty} has the highest average wait at ${maxAvgWait.avg_wait_days} days.`,
        voice_summary: `${maxAvgWait.specialty} has the highest average wait at ${maxAvgWait.avg_wait_days} days.`,
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> Waiting List Management",
            bullets: [
              `Specialty: ${maxAvgWait.specialty}`,
              `Average wait: ${maxAvgWait.avg_wait_days} days`,
              ...(waitTotal !== null ? [`Total waiting list: ${waitTotal}`] : []),
            ],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Review specialty rows directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          { source: sourceName, label: "Specialty", value: maxAvgWait.specialty },
          { source: sourceName, label: "Avg wait days", value: maxAvgWait.avg_wait_days },
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "waiting_list",
        finding_type: "max_avg_wait",
        finding_data: {
          specialty: maxAvgWait.specialty,
          avg_wait_days: maxAvgWait.avg_wait_days,
          total_waiting_list: waitTotal,
        },
        evidence_summary: "Operations -> Waiting List Management grouped specialty rows and tiles.",
      };
    } else if (queryKind === "max_waiting_volume" && maxWaiting) {
      deterministic = {
        title: "Largest waiting list volume",
        summary: `${maxWaiting.specialty} has the largest waiting-list volume at ${maxWaiting.total_waiting} patients.`,
        voice_summary: `${maxWaiting.specialty} has the largest waiting-list volume at ${maxWaiting.total_waiting}.`,
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> Waiting List Management",
            bullets: [
              `Specialty: ${maxWaiting.specialty}`,
              `Total waiting: ${maxWaiting.total_waiting}`,
            ],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Review grouped waiting-list rows.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          { source: sourceName, label: "Specialty", value: maxWaiting.specialty },
          { source: sourceName, label: "Total waiting", value: maxWaiting.total_waiting },
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "waiting_list",
        finding_type: "max_waiting_volume",
        finding_data: {
          specialty: maxWaiting.specialty,
          total_waiting: maxWaiting.total_waiting,
          total_waiting_list: waitTotal,
        },
        evidence_summary: "Operations -> Waiting List Management grouped specialty rows and tiles.",
      };
    } else if (queryKind === "capacity_gap") {
      deterministic = {
        title: "Capacity gap hotspots",
        summary: capacityGaps.length > 0
          ? `Largest capacity gap is in ${capacityGaps[0].specialty} (${capacityGaps[0].capacity_gap}).`
          : "No positive capacity gaps are shown in the current waiting list rows.",
        voice_summary: capacityGaps.length > 0
          ? `Largest capacity gap is in ${capacityGaps[0].specialty} (${capacityGaps[0].capacity_gap}).`
          : "No positive capacity gaps are shown in the current waiting list rows.",
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> Waiting List Management",
            bullets: capacityGaps.length > 0
              ? capacityGaps.slice(0, 5).map((item) => `${item.specialty}: gap ${item.capacity_gap}`)
              : ["All specialties currently show zero capacity gap in this payload."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Inspect capacity gap values directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "waiting_list",
        finding_type: "capacity_gap",
        finding_data: {
          specialty: capacityGaps[0]?.specialty,
          capacity_gap: capacityGaps[0]?.capacity_gap,
          capacity_gap_specialties: capacityGaps.map((item) => item.specialty),
        },
        evidence_summary: "Operations -> Waiting List Management grouped specialty rows and tiles.",
      };
    } else {
      const summarySignals = summarizeTopSignals(waitingPage);
      const totalLine = waitTotal !== null ? `Total waiting list is ${waitTotal}.` : "Total waiting list is not present as a tile in this payload.";
      deterministic = {
        title: "Waiting list management",
        summary: totalLine,
        voice_summary: totalLine,
        sections: [
          {
            heading: "Top signals",
            body: "Derived from grouped waiting-list tiles and specialty rows.",
            bullets: summarySignals.length > 0 ? summarySignals : ["No aggregated waiting-list signals were available."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Review grouped waiting-list data directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "waiting_list",
        finding_type: "summary",
        finding_data: {
          total_waiting_list: waitTotal,
          specialty: maxAvgWait?.specialty,
          avg_wait_days: maxAvgWait?.avg_wait_days,
          capacity_gap_specialties: capacityGaps.map((item) => item.specialty),
        },
        evidence_summary: "Operations -> Waiting List Management grouped specialty rows and tiles.",
      };
    }
  }
  let ptlAnalyserHandled = false;
  if (!cancer2wwAnalyserHandled && !referralsAnalyserHandled && !dataQualityAnalyserHandled && !clockAnalyserHandled && !milestonesAnalyserHandled && !breachAnalyserHandled && !triageAnalyserHandled && !rttAnalyserHandled && !waitingAnalyserHandled && ptlViewRead && isPtlOperationalQuestion(prompt)) {
    trace.constraints.push("ptl_analyser_used:true");
    ptlAnalyserHandled = true;
    if (ptlRows.length === 0) {
      deterministic = {
        title: "PTL page",
        summary: "The PTL page returned no rows.",
        voice_summary: "The PTL page returned no rows.",
        sections: [
          {
            heading: "What I checked",
            body: "Checked: Operations -> PTL",
            bullets: ["No rows were available in the PTL dataset."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open PTL page",
            rationale: "Inspect the PTL view directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "PTL" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "PTL page was read but no rows were returned." },
        signal_strength: firewall.signal_strength,
      };
      explanationContext = {
        page_type: "ptl",
        finding_type: "no_rows",
        finding_data: {},
        evidence_summary: "Operations -> PTL patient-level rows.",
      };
    } else {
      const queryKind = detectPtlQueryKind(prompt);
      const statuses = countByStatus(ptlRows);
      const specialties = countBySpecialty(ptlRows);
      const topSpecialty = Object.entries(specialties).sort((a, b) => b[1] - a[1])[0];
      if (queryKind === "longest_waiter") {
        const longest = findLongestWaiter(ptlRows);
        if (longest) {
          deterministic = {
            title: "Longest waiter",
            summary: `${longest.patient_name} is currently the longest waiter at ${longest.waiting_days} days (${longest.specialty}).`,
            voice_summary: `${longest.patient_name} is currently the longest waiter at ${longest.waiting_days} days.`,
            sections: [
              {
                heading: "What I checked",
                body: "Checked: Operations -> PTL",
                bullets: [
                  `Patient: ${longest.patient_name}`,
                  `Waiting days: ${longest.waiting_days}`,
                  `Specialty: ${longest.specialty}`,
                ],
              },
            ],
            tables: [],
            next_actions: [
              {
                label: "Open PTL page",
                rationale: "Review full PTL rows.",
                action_type: "open",
                payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "PTL" },
              },
            ],
            context_cards: [],
            data_used: firewall.evidence,
            confidence: firewall.confidence,
            signal_strength: firewall.signal_strength,
          };
          explanationContext = {
            page_type: "ptl",
            finding_type: "longest_waiter",
            finding_data: {
              patient_name: longest.patient_name,
              specialty: longest.specialty,
              waiting_days: longest.waiting_days,
              rtt_target_weeks: longest.rtt_target_weeks,
            },
            evidence_summary: "Operations -> PTL patient-level rows.",
          };
        }
      } else if (queryKind === "breaches" || queryKind === "urgent_breaches") {
        const breaches = findBreaches(ptlRows);
        const urgentBreaches = findUrgentBreaches(ptlRows);
        const longestBreach = breaches.length > 0
          ? [...breaches].sort((a, b) => b.waiting_days - a.waiting_days)[0]
          : null;
        deterministic = {
          title: "PTL breaches",
          summary: `PTL has ${breaches.length} breaching patients, including ${urgentBreaches.length} urgent breaches.`,
          voice_summary: `PTL has ${breaches.length} breaching patients, including ${urgentBreaches.length} urgent breaches.`,
          sections: [
            {
              heading: "What I checked",
              body: "Checked: Operations -> PTL",
              bullets: [
                `Breaching: ${breaches.length}`,
                `Urgent + breaching: ${urgentBreaches.length}`,
                ...(longestBreach ? [`Longest breach wait: ${longestBreach.waiting_days} days`] : []),
              ],
            },
          ],
          tables: [],
          next_actions: [
            {
              label: "Open PTL page",
              rationale: "Inspect breaching rows directly.",
              action_type: "open",
              payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "PTL" },
            },
          ],
          context_cards: [],
          data_used: firewall.evidence,
          confidence: firewall.confidence,
          signal_strength: firewall.signal_strength,
        };
        explanationContext = {
          page_type: "ptl",
          finding_type: queryKind,
          finding_data: {
            breaches: breaches.length,
            urgent_breaches: urgentBreaches.length,
          },
          evidence_summary: "Operations -> PTL patient-level rows.",
        };
      } else {
        deterministic = {
          title: "PTL waiting count",
          summary: `There are ${countPatients(ptlRows)} patients on the PTL. ${statuses.breaching} are breaching and ${statuses.at_risk} are at risk.`,
          voice_summary: `There are ${countPatients(ptlRows)} patients on the PTL.`,
          sections: [
            {
              heading: "What I checked",
              body: "Checked: Operations -> PTL",
              bullets: [
                `Total PTL rows: ${countPatients(ptlRows)}`,
                `Breaching: ${statuses.breaching}`,
                `At risk: ${statuses.at_risk}`,
                ...(topSpecialty ? [`Largest specialty: ${topSpecialty[0]} (${topSpecialty[1]})`] : []),
              ],
            },
          ],
          tables: [],
          next_actions: [
            {
              label: "Open PTL page",
              rationale: "Review PTL rows directly.",
              action_type: "open",
              payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "PTL" },
            },
          ],
          context_cards: [],
          data_used: firewall.evidence,
          confidence: firewall.confidence,
          signal_strength: firewall.signal_strength,
        };
        explanationContext = {
          page_type: "ptl",
          finding_type: "count",
          finding_data: {
            total: countPatients(ptlRows),
            breaches: statuses.breaching,
            at_risk: statuses.at_risk,
          },
          evidence_summary: "Operations -> PTL patient-level rows.",
        };
      }
    }
  }
  if (routingPath === "deep_reasoning" && selectedTools.includes("view.read")) {
    const hasViewPayload = Boolean(firewall.facts.view) || (Array.isArray(firewall.facts.views) && (firewall.facts.views as any[]).length > 0);
    const hasRows = firewall.evidence.some((item) => Array.isArray(item.records) && item.records.length > 0);
    const hasWaitingSummaryRows = Boolean(waitingPage && (waitingPage.rows.length > 0 || waitingTilesCount(waitingPage) > 0));
    const hasCancerSummaryData = Boolean(cancer2wwPage && (cancer2wwPage.rows.length > 0 || cancer2wwTilesCount(cancer2wwPage) > 0));
    const hasReferralSummaryData = Boolean(referralsPage && (referralsPage.rows.length > 0 || referralTilesCount(referralsPage) > 0));
    const hasTriageSummaryData = Boolean(triagePage && (triagePage.rows.length > 0 || triageTilesCount(triagePage) > 0));
    const hasBreachSummaryData = Boolean(breachPage && (breachPage.rows.length > 0 || breachTilesCount(breachPage) > 0));
    const hasMilestonesSummaryData = Boolean(milestonesPage && milestonesPage.rows.length > 0);
    const hasClockSummaryData = Boolean(clockPage && (clockPage.rows.length > 0 || clockTilesCount(clockPage) > 0));
    const hasDataQualitySummaryData = Boolean(dataQualityPage && (dataQualityPage.rows.length > 0 || dataQualityTilesCount(dataQualityPage) > 0));
    if ((!hasViewPayload || !hasRows) && (!ptlViewRead || ptlRows.length === 0) && !hasWaitingSummaryRows && !hasCancerSummaryData && !hasReferralSummaryData && !hasTriageSummaryData && !hasBreachSummaryData && !hasMilestonesSummaryData && !hasClockSummaryData && !hasDataQualitySummaryData) {
      const firstView = deepReasoningViewIds[0] || viewFinderSelectedIds[0] || pagesFirstViewId || "";
      const deeplink = firstView ? viewIdToDeeplink(firstView) : pageContext?.deeplink;
      deterministic = {
        title: "I checked the page, but there is no usable data yet",
        summary: "I can open the page, but the dataset returned no rows or missing fields for this request.",
        voice_summary: "I can open the page, but the dataset returned no rows or missing fields for this request.",
        sections: [
          {
            heading: "What I checked",
            body: firstView ? `Checked: ${firstView.replace(/\./g, " -> ")}` : "Checked selected page",
            bullets: ["No rows were returned that can support a grounded answer."],
          },
        ],
        tables: [],
        next_actions: deeplink ? [{
          label: "Open checked page",
          rationale: "Inspect the view directly.",
          action_type: "open",
          payload: { type: "open_view", deeplink, label: "Open page" },
        }] : [],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: "View read completed but returned insufficient rows." },
        signal_strength: { level: "low", score: 10, rationale: "No usable rows in payload." },
      };
    }
  }
  if (pendingWorkQuery && selectedTools.includes("view.read")) {
    const viewFacts = Array.isArray(firewall.facts.views)
      ? firewall.facts.views as Array<{ view_id: string; data: any }>
      : [];
    const findViewData = (viewId: string) => viewFacts.find((entry) => entry.view_id === viewId)?.data;
    const pending = buildPendingSummary({
      planning: {
        sessions: findViewData("planning.sessions"),
        roster_shifts: findViewData("planning.roster_shifts"),
      },
      collaboration: {
        deliverables: findViewData("collaboration.deliverables"),
        forum: findViewData("collaboration.forum"),
      },
    });

    deterministic = {
      title: "Pending work",
      summary: pending.summary,
      voice_summary: pending.summary,
      sections: [
        {
          heading: "Pending overview",
          body: "Current outstanding work across planning and collaboration.",
          bullets: pending.bullets,
        },
      ],
      tables: [],
      next_actions: [
        {
          label: "Open Planning",
          rationale: "Review sessions and shifts.",
          action_type: "open",
          payload: { deeplink: "/?section=planning&view=sessions" },
        },
        {
          label: "Open Collaboration",
          rationale: "Review deliverables and threads.",
          action_type: "open",
          payload: { deeplink: "/?section=collaboration&view=forum" },
        },
      ],
      context_cards: [],
      data_used: firewall.evidence,
      confidence: firewall.confidence,
      signal_strength: firewall.signal_strength,
    };
  }
  if (waitingListExtremesQuery && selectedTools.includes("view.read")) {
    const waitingSource = "view.read:operations.access_pathways_waiting_list";
    const waitingEvidence = firewall.evidence.find((entry) => entry.source === waitingSource);
    const records = Array.isArray(waitingEvidence?.records)
      ? waitingEvidence.records.filter((record) => record && typeof record === "object")
      : [];
    const recordsWithWaitDays = records.filter((record: any) => typeof record.waiting_days === "number");
    const sortedByWait = [...recordsWithWaitDays].sort((a: any, b: any) => Number(b.waiting_days) - Number(a.waiting_days));
    const longest = sortedByWait[0] as any | undefined;
    const specialties = Array.from(
      new Set(
        recordsWithWaitDays
          .map((record: any) => String(record.specialty || "").trim())
          .filter((value: string) => Boolean(value)),
      ),
    );
    const hasSpecialtyMention = specialties.some((specialty) => specialty && prompt.toLowerCase().includes(specialty.toLowerCase()));

    if (longest && typeof longest.patient_name === "string") {
      const longestWait = Number(longest.waiting_days);
      const longestSpecialty = String(longest.specialty || "Unknown specialty");
      const needsSpecialtyClarification = specialties.length > 1 && !hasSpecialtyMention;
      const summaryBase = `Longest waiter is ${longest.patient_name} in ${longestSpecialty}, waiting ${longestWait} days.`;
      const summary = needsSpecialtyClarification
        ? `${summaryBase} Do you want this narrowed to one specialty?`
        : summaryBase;
      deterministic = {
        title: "Longest waiter",
        summary,
        voice_summary: summary,
        sections: [
          {
            heading: "Waiting list extremes",
            body: "Pulled from the waiting list view.",
            bullets: [
              `Patient: ${longest.patient_name}`,
              `Specialty: ${longestSpecialty}`,
              `Waiting days: ${longestWait}`,
            ],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Review full waiting list records.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
          ...(
            needsSpecialtyClarification
              ? specialties.slice(0, 3).map((specialty) => ({
                label: specialty,
                rationale: "Narrow longest waiter check to this specialty.",
                action_type: "ask" as const,
                payload: { type: "clarify", kind: "missing_required_tool", choice: `longest waiter ${specialty}` },
              }))
              : []
          ),
        ],
        context_cards: [],
        data_used: [
          ...firewall.evidence,
          { source: waitingSource, label: "Patient", value: String(longest.patient_name) },
          { source: waitingSource, label: "Waiting days", value: longestWait },
          { source: waitingSource, label: "Specialty", value: longestSpecialty },
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
    } else {
      const summary = "I can see the waiting list view, but it does not include wait durations in this payload. Want me to open the page so you can view it?";
      deterministic = {
        title: "Waiting list view loaded",
        summary,
        voice_summary: summary,
        sections: [
          {
            heading: "What I found",
            body: "The waiting list view is reachable, but wait-duration fields are missing for extremes ranking.",
            bullets: ["Open the waiting list page for direct inspection."],
          },
        ],
        tables: [],
        next_actions: [
          {
            label: "Open waiting list page",
            rationale: "Review waiting list directly.",
            action_type: "open",
            payload: { type: "open_view", deeplink: "/?section=operations&view=waiting", label: "Waiting list" },
          },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
    }
  }
  if (explanationContext) {
    const accessPathwaysNarrative = buildAccessPathwaysNarrative({
      context: explanationContext,
      ptlViewRead,
      ptlRows,
      waitingPage,
      waitingEvidence,
      breachPage,
      breachEvidence,
      breachViewRead,
    });
    trace.constraints.push(`lifecycle_stage:${accessPathwaysNarrative.lifecycleStage}`);
    trace.constraints.push("lifecycle_context_applied:true");
    trace.constraints.push(`cross_page_checked:${accessPathwaysNarrative.crossPageChecked}`);
    deterministic = applyNarrativeExplanation(deterministic, explanationContext, "concise", accessPathwaysNarrative);
  }
  if (!ptlAnalyserHandled && !waitingAnalyserHandled && !rttAnalyserHandled && !triageAnalyserHandled && !breachAnalyserHandled && !milestonesAnalyserHandled && !clockAnalyserHandled && !dataQualityAnalyserHandled && isLongestWaiterRequest(prompt) && firewall.facts.ptl_summary) {
    const summary = firewall.facts.ptl_summary as any;
    const longest = summary.longestWaiters?.[0];
    if (longest) {
      deterministic = {
        title: "Longest waiting patient",
        summary: `Longest waiting patient is ${longest.patient_name} (${longest.specialty}), waiting ${longest.waiting_days} days.`,
        voice_summary: `Longest waiting patient is ${longest.patient_name} in ${longest.specialty}.`,
        sections: [
          {
            heading: "Context",
            body: "This reflects the single longest wait across connected pathways.",
            bullets: ["Ask for the top five if needed", "Review scheduling options"],
          },
        ],
        tables: [
          {
            title: "Patient details",
            columns: ["Patient", "Specialty", "Waiting days"],
            rows: [[longest.patient_name, longest.specialty, String(longest.waiting_days)]],
            row_links: [],
          },
        ],
        next_actions: firewall.permitted_actions,
        context_cards: [],
        data_used: [
          { source: "EPR/PTL", label: "Patient", value: longest.patient_name, ids: [longest.patient_id] },
          { source: "EPR/PTL", label: "Specialty", value: longest.specialty },
          { source: "EPR/PTL", label: "Waiting days", value: longest.waiting_days },
        ],
        confidence: firewall.confidence,
        signal_strength: firewall.signal_strength,
      };
    }
  }
  if (!ptlAnalyserHandled && !waitingAnalyserHandled && !rttAnalyserHandled && !triageAnalyserHandled && !breachAnalyserHandled && !milestonesAnalyserHandled && !clockAnalyserHandled && !dataQualityAnalyserHandled && firewall.intent === "operational_query" && firewall.facts.ptl_summary) {
    const summary = firewall.facts.ptl_summary as any;
    const counts = summary.counts || {};
    deterministic = {
      title: "PTL summary",
      summary: buildPtlNarrative(counts),
      voice_summary: buildPtlNarrative(counts),
      sections: [
        {
          heading: "What this means",
          body: "Focus on breaches first, then urgent cases, then flow blockers.",
          bullets: ["Review breaching pathways first", "Check urgent cases", "Open PTL for detail"],
        },
      ],
      tables: [],
      next_actions: firewall.permitted_actions,
      context_cards: [],
      data_used: firewall.evidence,
      confidence: firewall.confidence,
      signal_strength: firewall.signal_strength,
    };
  }

  if (firewall.intent === "staffing") {
    deterministic = {
      title: "Staffing status",
      summary: buildStaffingNarrative(!firewall.missing_sources.includes("ROSTER")),
      voice_summary: buildStaffingNarrative(!firewall.missing_sources.includes("ROSTER")),
      sections: [
        {
          heading: "What this means",
          body: firewall.missing_sources.includes("ROSTER")
            ? "I can proceed once a roster system is connected."
            : "Roster data is connected but not yet normalized into TOM metrics.",
          bullets: firewall.missing_sources.includes("ROSTER")
            ? ["Connect Allocate", "Connect HealthRoster", "Connect Optima"]
            : ["Confirm site mapping", "Specify a team or ward"],
        },
      ],
      tables: [],
      next_actions: firewall.permitted_actions,
      context_cards: [],
      data_used: firewall.evidence,
      confidence: firewall.confidence,
      signal_strength: firewall.signal_strength,
    };
  }

  if (firewall.intent === "locate") {
    const lookup = firewall.facts.person_lookup as any;
    const entityName: string = lookup?.query_name ?? extractEntityName(prompt) ?? "that person";
    const currentPageViewId = deriveViewIdFromPageContext(pageContext);

    // Helper: extract row arrays from view data regardless of field name shape.
    // Each reader may store rows under a different key; try all known keys, then
    // fall back to vd.data (used by PTL and some other readers) if it's an array.
    const extractViewRows = (vd: any): any[] => {
      if (!vd || typeof vd !== "object") return [];
      const candidates = [
        vd.rows, vd.ptl_rows, vd.waiters, vd.patients, vd.items,
        vd.shifts, vd.sessions, vd.deliverables, vd.posts, vd.events,
      ];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c;
      }
      // PTL and some readers nest the array in `.data`
      if (Array.isArray(vd.data) && vd.data.length > 0) return vd.data;
      return [];
    };

    // Helper: build a navigation deeplink from a view_id ("operations.ptl" → "/?section=operations&view=ptl")
    const viewIdToDeeplink = (viewId: string): string => {
      const parts = viewId.split(".");
      if (parts.length < 2) return "/";
      return `/?section=${parts[0]}&view=${parts.slice(1).join("_")}`;
    };

    // Collect all view data that came back from view.read (may be multi-view)
    const allViews: Array<{ view_id: string; data: any }> =
      Array.isArray(firewall.facts.views)
        ? (firewall.facts.views as Array<{ view_id: string; data: any }>)
        : firewall.facts.view
        ? [{ view_id: currentPageViewId ?? "view.read", data: firewall.facts.view }]
        : [];

    // Search every view for entity name matches
    type ViewMatch = { viewId: string; viewLabel: string; rowIdx: number; row: Record<string, any> };
    const allViewMatches: ViewMatch[] = [];
    for (const { view_id, data } of allViews) {
      const rows = extractViewRows(data);
      const vLabel = VIEW_REGISTRY.find(v => v.id === view_id)?.label ?? view_id;
      rows.forEach((row: any, idx: number) => {
        if (JSON.stringify(row).toLowerCase().includes(entityName.toLowerCase())) {
          allViewMatches.push({ viewId: view_id, viewLabel: vLabel, rowIdx: idx, row });
        }
      });
    }

    if (allViewMatches.length > 0) {
      // Case 1 — found in one or more views
      const byView = new Map<string, ViewMatch[]>();
      for (const m of allViewMatches) {
        if (!byView.has(m.viewId)) byView.set(m.viewId, []);
        byView.get(m.viewId)!.push(m);
      }
      const matchCount = allViewMatches.length;
      const viewCount = byView.size;
      const firstViewId = allViewMatches[0].viewId;
      const firstViewLabel = allViewMatches[0].viewLabel;
      const isOnCurrentPage = firstViewId === currentPageViewId;

      const tables: any[] = [];
      const nextActions: any[] = [];

      for (const [viewId, matches] of byView) {
        const firstRow = matches[0].row;
        const skipKeys = new Set(["id", "row_id", "_id", "key"]);
        const detailCols = Object.keys(firstRow).filter(k =>
          !skipKeys.has(k) && firstRow[k] !== null && firstRow[k] !== undefined && String(firstRow[k]).trim() !== ""
        );
        const tableCols = detailCols.slice(0, 6);
        const tableRows = matches.map(m => tableCols.map(k => String(m.row[k] ?? "—")));
        const vLabel = VIEW_REGISTRY.find(v => v.id === viewId)?.label ?? viewId;
        tables.push({
          title: `${entityName} — ${vLabel}`,
          columns: tableCols.map(k => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())),
          rows: tableRows,
          row_links: [],
          highlight_rows: tableRows.map((_, i) => i),
        });
        if (viewId === currentPageViewId) {
          nextActions.push({ label: "Show where", rationale: "Highlight the matching row on this page.", action_type: "highlight", payload: { rows: matches.map(m => m.rowIdx), view_id: viewId } });
        } else {
          nextActions.push({ label: `Open ${vLabel}`, rationale: `Navigate to ${vLabel} to see ${entityName}.`, action_type: "open", payload: { type: "open_view", deeplink: viewIdToDeeplink(viewId), label: vLabel } });
        }
      }
      nextActions.push({ label: "Open Staff Finder", rationale: "View full staff profile.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=logistics&view=staff", label: "Staff Finder" } });

      const locationSummary = viewCount === 1 ? `in **${firstViewLabel}**` : `across **${viewCount} views**`;
      deterministic = {
        title: entityName,
        summary: `**${entityName}** found — ${matchCount} match${matchCount !== 1 ? "es" : ""} ${locationSummary}.`,
        voice_summary: `${entityName} found in ${viewCount === 1 ? firstViewLabel : viewCount + " views"}.`,
        sections: [],
        tables,
        next_actions: nextActions,
        context_cards: [],
        data_used: [
          { source: isOnCurrentPage ? "Current page" : "App views", label: entityName, value: `${matchCount} match${matchCount !== 1 ? "es" : ""}` },
          ...firewall.evidence,
        ],
        confidence: { level: "high", rationale: `Matched '${entityName}' across ${viewCount} view${viewCount !== 1 ? "s" : ""}.` },
        signal_strength: { level: "high", score: 85, rationale: `Found in ${viewCount} live view${viewCount !== 1 ? "s" : ""}.` },
      };
    } else if (lookup?.match_type === "multiple") {
      // Case 2 — multiple matches in connected systems
      const matches: any[] = lookup.matches ?? [];
      deterministic = {
        title: `Multiple matches: ${entityName}`,
        summary: `I found **${matches.length} people** named ${entityName} across connected systems. Which one do you mean?`,
        voice_summary: `I found ${matches.length} people named ${entityName}. Which one do you mean?`,
        sections: [],
        tables: [
          {
            title: "Matches",
            columns: ["Name", "Role", "Department", "Site", "Status"],
            rows: matches.map(m => [m.name ?? entityName, m.role ?? "—", m.department ?? "—", m.site ?? "—", m.status ?? "—"]),
            row_links: [],
          },
        ],
        next_actions: [
          { label: "Filter by site", rationale: "Narrow to your site.", action_type: "filter", payload: { filter: "site" } },
          { label: "Open Staff Finder", rationale: "Browse the full directory.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=logistics&view=staff", label: "Staff Finder" } },
        ],
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "medium", rationale: `${matches.length} people share the name '${entityName}'.` },
        signal_strength: firewall.signal_strength,
      };
    } else {
      // Case 3 — not found anywhere
      const entityType = classifyLocateEntityType(prompt, pageContext?.section);
      // Build a meaningful description of what was actually searched
      const viewsSearchedLabels = allViews
        .map(v => VIEW_REGISTRY.find(r => r.id === v.view_id)?.label ?? v.view_id)
        .filter(Boolean);
      const searchedSummary = viewsSearchedLabels.length > 0
        ? viewsSearchedLabels.join(", ")
        : "connected pathway views";
      // Entity-type-aware suggestions
      const patientHint = entityType !== "staff";
      const staffHint = entityType !== "patient";
      const clarifyBullets: string[] = [];
      if (patientHint) clarifyBullets.push("A patient on the PTL, waiting list, or pathway");
      if (staffHint) clarifyBullets.push("A member of staff, bank worker, or clinician");
      clarifyBullets.push("A supplier or external contact");
      clarifyBullets.push("Someone mentioned in a collaboration thread or audit log");
      const notFoundActions: any[] = [];
      if (patientHint) notFoundActions.push({ label: "Open PTL", rationale: "Browse all active patient pathways.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "PTL" } });
      if (staffHint) notFoundActions.push({ label: "Open Staff Finder", rationale: "Find by name, role, or department.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=logistics&view=staff_finder", label: "Staff Finder" } });
      notFoundActions.push({ label: "Search Collaboration", rationale: "Find mentions in threads or deliverables.", action_type: "open", payload: { type: "open_view", deeplink: "/?section=collaboration", label: "Collaboration" } });
      deterministic = {
        title: `Not found: ${entityName}`,
        summary: `I searched **${searchedSummary}** — no match found for **${entityName}**.`,
        voice_summary: `I couldn't find ${entityName} in ${searchedSummary}.`,
        sections: [
          {
            heading: "What I searched",
            body: searchedSummary,
            bullets: [],
          },
          {
            heading: "Help me look in the right place",
            body: "Is this person one of the following?",
            bullets: clarifyBullets,
          },
        ],
        tables: [],
        next_actions: notFoundActions,
        context_cards: [],
        data_used: firewall.evidence,
        confidence: { level: "low", rationale: `No match for '${entityName}' in ${searchedSummary}.` },
        signal_strength: { level: "low", score: 20, rationale: `No matches found in ${searchedSummary}.` },
      };
    }
  }

  if (firewall.intent === "smalltalk") {
    const smalltalkVariants = [
      "Good day. How can I support you today?",
      "Hello there. What shall we dive into?",
      "Welcome. What would you like to explore?",
      "Hi. How can I help?",
      "Greetings. Whatâ€™s on your mind?",
      "Good to see you. What are we working on?",
      "Hello. Where would you like to begin?",
      "Welcome back. What can I assist you with?",
      "Hi there. What would you like to tackle?",
      "Good day. Whatâ€™s our focus today?",
      "Hello. How may I be of service?",
      "Welcome. What would you like to discuss?",
      "Hi. What are we looking into today?",
      "Greetings. How can I assist?",
      "Good day. Whatâ€™s the plan?",
      "Hello again. What would you like to review?",
      "Welcome back. Whatâ€™s next?",
      "Hi there. What shall we work through?",
      "Good to have you here. What are we addressing?",
      "Hello. What would you like help with?",
      "Welcome. Where shall we start?",
      "Hi. What would you like to focus on today?",
      "Greetings. What are we unpacking?",
      "Good day. What can I do for you?",
      "Hello. Whatâ€™s the topic?",
      "Welcome back. What are we solving?",
      "Hi there. Whatâ€™s todayâ€™s objective?",
      "Good to see you. How can I assist?",
      "Hello. Whatâ€™s on the agenda?",
      "Welcome. What shall we examine?",
      "Hi. What would you like to accomplish?",
      "Greetings. Whatâ€™s our starting point?",
      "Good day. What needs attention?",
      "Hello again. What can I look into for you?",
      "Welcome back. What are we building?",
      "Hi there. What would you like clarity on?",
      "Good to connect. What are we exploring?",
      "Hello. What would you like to refine?",
      "Welcome. Whatâ€™s our direction?",
      "Hi. What shall we sort out?",
      "Greetings. What would you like assistance with?",
      "Good day. What are we diving into today?",
      "Hello. Whatâ€™s the priority?",
      "Welcome back. What shall we focus on first?",
      "Hi there. What would you like insight on?",
      "Good to see you. Whatâ€™s our task?",
      "Hello. What are we breaking down?",
      "Welcome. What would you like to analyze?",
      "Hi. Whatâ€™s our goal today?",
      "Greetings. What shall we begin with?",
      "Good day. What would you like to accomplish today?",
      "Hello again. What are we reviewing?",
      "Welcome back. Whatâ€™s the challenge?",
      "Hi there. What would you like guidance on?",
      "Good to connect. What are we planning?",
      "Hello. What needs exploring?",
      "Welcome. Whatâ€™s the next step?",
      "Hi. What are we looking at?",
      "Greetings. Whatâ€™s the focus area?",
      "Good day. How can I contribute?",
      "Hello. Whatâ€™s our subject?",
      "Welcome back. What are we addressing today?",
      "Hi there. What would you like to work through first?",
      "Good to see you. Whatâ€™s todayâ€™s focus?",
      "Hello. What shall we tackle together?",
      "Welcome. Whatâ€™s the assignment?",
      "Hi. What are we digging into?",
      "Greetings. What can I clarify?",
      "Good day. Whatâ€™s the matter at hand?",
      "Hello again. What are we outlining?",
      "Welcome back. What deserves attention?",
      "Hi there. What are we shaping today?",
      "Good to connect. What would you like to examine first?",
      "Hello. What are we resolving?",
      "Welcome. Whatâ€™s the inquiry?",
      "Hi. What would you like to map out?",
      "Greetings. What are we drafting?",
      "Good day. Whatâ€™s our aim?",
      "Hello. What are we polishing?",
      "Welcome back. What shall we investigate?",
      "Hi there. What are we outlining today?",
      "Good to see you. Whatâ€™s the question?",
      "Hello. What are we preparing?",
      "Welcome. What would you like to get done?",
      "Hi. What are we evaluating?",
      "Greetings. Whatâ€™s the discussion point?",
      "Good day. What would you like to pursue?",
      "Hello again. What are we strategizing?",
      "Welcome back. What can I help you move forward on?",
      "Hi there. What are we working toward?",
      "Good to connect. Whatâ€™s the objective?",
      "Hello. What are we piecing together?",
      "Welcome. Whatâ€™s the request?",
      "Hi. What would you like to sort through?",
      "Greetings. What are we tackling first?",
      "Good day. Whatâ€™s the situation?",
      "Hello again. What are we refining today?",
      "Welcome back. What would you like to expand on?",
      "Hi there. Whatâ€™s the next move?",
      "Good to have you here. What shall we focus on today?",
    ];
    const greeting = smalltalkVariants[Math.abs(sessionId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % smalltalkVariants.length];
    const isCapabilityQuery = /what can you do|what do you do|how can you help|capabilities|^help\b/i.test(prompt);
    const capabilitySummary =
      "I can answer operational questions using connected systems, surface PTL and waiting list pressure, highlight breaches and risks, and open specific views when you ask.";
    deterministic = {
      title: "Hi",
      summary: isCapabilityQuery ? capabilitySummary : greeting,
      voice_summary: isCapabilityQuery ? capabilitySummary : greeting,
      sections: isCapabilityQuery
        ? [
            {
              heading: "What I can do",
              body: "Ask in plain language. I will only use connected data.",
              bullets: [
                "PTL, waiting list, RTT, and breach status",
                "Risk signals and operational anomalies",
                "Open or filter operational views",
              ],
            },
          ]
        : [],
      tables: [],
      next_actions: [],
      context_cards: [],
      data_used: [],
      confidence: { level: "low", rationale: "No data used." },
      signal_strength: { level: "low", score: 0, rationale: "No sources used." },
    };
  }

  if (!pendingWorkQuery && firewall.intent !== "locate" && selectedTools.includes("view.read") && (firewall.facts.view || firewall.facts.views)) {
    const viewIdsFromEvidence = Array.from(
      new Set(
        firewall.evidence
          .map((item) => item.source)
          .filter((source) => source.startsWith("view.read:"))
          .map((source) => source.replace("view.read:", "")),
      ),
    );
    const selectedViewIds = viewFinderSelectedIds.length > 0
      ? viewFinderSelectedIds
      : (pagesFirstViewId ? [pagesFirstViewId] : viewIdsFromEvidence);
    const primaryView = selectedViewIds[0] ?? "current view";
    const viewFacts = Array.isArray(firewall.facts.views)
      ? firewall.facts.views as Array<{ view_id: string; data: any }>
      : [{ view_id: primaryView, data: firewall.facts.view as any }];
    const sections = viewFacts.flatMap((viewEntry) => {
      const table = coerceTableFromViewData(viewEntry?.data);
      const label = VIEW_REGISTRY.find((view) => view.id === viewEntry.view_id)?.label ?? toTitle(viewEntry.view_id);
      if (!table) {
        return [{
          heading: label,
          body: "Data is available for this view.",
          bullets: [],
        }];
      }
      return [{
        type: "table" as const,
        title: label,
        heading: label,
        body: "Table snapshot",
        bullets: [],
        table,
      }];
    });
    const summary = selectedViewIds.length > 1
      ? `I reviewed ${selectedViewIds.join(" and ")}.`
      : `I reviewed ${primaryView}.`;
    const checkedLine = selectedViewIds.length > 0
      ? `Checked: ${selectedViewIds.join(" -> ")}`
      : "Checked: current page";
    deterministic = {
      title: selectedViewIds.length > 1 ? "Cross-view summary" : "Current page summary",
      summary,
      voice_summary: summary,
      sections: [
        {
          heading: "What I checked",
          body: checkedLine,
          bullets: [],
        },
        ...sections,
      ],
      tables: [],
      next_actions: [],
      context_cards: [],
      data_used: firewall.evidence,
      confidence: firewall.confidence,
      signal_strength: firewall.signal_strength,
    };
    if (sections.some((section) => (section as any).type === "table")) {
      trace.constraints.push("table_snapshot:true");
    }
  }

  if (planningLikeQuery) {
    deterministic = {
      title: "Planning workspace",
      summary: "I prepared a planning canvas you can use right away.",
      voice_summary: "I prepared a planning canvas you can use right away.",
      sections: [
        {
          heading: "What is ready",
          body: "A deterministic planning template is available in canvas.",
          bullets: ["Use it to structure objectives, constraints, checklist, risks, and next steps."],
        },
      ],
      tables: [],
      next_actions: deterministic.next_actions,
      context_cards: [],
      data_used: firewall.evidence,
      confidence: firewall.confidence,
      signal_strength: firewall.signal_strength,
    };
  }

  const orchestrationActions: RichResponse["next_actions"] = [];
  if (planningLikeQuery) {
    orchestrationActions.push(
      {
        label: "Open Planning Canvas",
        rationale: "Start with a deterministic planning template.",
        action_type: "open",
        payload: {
          type: "open_canvas",
          canvas: {
            title: "Session Plan Workspace",
            kind: "plan",
            markdown: buildPlanningCanvasMarkdown(),
          },
        },
      },
      {
        label: "Open Planning",
        rationale: "Jump to planning views.",
        action_type: "open",
        payload: { type: "open_view", deeplink: "/?section=planning&view=sessions", label: "Planning sessions" },
      },
      {
        label: "Pin Plan Template",
        rationale: "Save this template for quick reuse.",
        action_type: "open",
        payload: {
          type: "pin",
          pin: { title: "Session Plan Template", markdown: buildPlanningCanvasMarkdown() },
        },
      },
    );
  }
  if (selectedTools.includes("view.read") && firewall.intent !== "locate") {
    const viewId = viewFinderSelectedIds[0] || pagesFirstViewId || "";
    const deeplink = pageContext?.deeplink || (viewId ? viewIdToDeeplink(viewId) : "");
    if (deeplink) {
      orchestrationActions.push({
        label: "Open this page",
        rationale: "Go directly to the selected workspace view.",
        action_type: "open",
        payload: { type: "open_view", deeplink, label: "Open view" },
      });
    }
  }
  if (isPtlTrackerQuery(prompt)) {
    orchestrationActions.push({
      label: "Open PTL tracker",
      rationale: "Go directly to the PTL view.",
      action_type: "open",
      payload: { type: "open_view", deeplink: "/?section=operations&view=ptl", label: "PTL tracker" },
    });
  }
  if (orchestrationActions.length > 0) {
    deterministic = {
      ...deterministic,
      next_actions: [...orchestrationActions, ...deterministic.next_actions],
    };
  }

  const skipLlm = firewall.intent === "smalltalk" || firewall.intent === "locate" || pendingWorkQuery || planningLikeQuery;
  const llmRich = skipLlm
    ? null
    : await callOpenAiStructured({
        prompt,
        dataContext,
        fallback: deterministic,
      });
  const llmUsed = Boolean(llmRich);

  let finalRich = llmRich ?? deterministic;
  const preferredData = firewall.intent === "smalltalk"
    ? []
    : deterministic.data_used.length
      ? deterministic.data_used
      : firewall.evidence;
  finalRich = {
    ...finalRich,
    data_used: preferredData.length ? preferredData : finalRich.data_used,
    next_actions: deterministic.next_actions.length ? deterministic.next_actions : finalRich.next_actions,
  };
  if (pagesFirst && pageContext?.deeplink) {
    const exists = finalRich.next_actions.some((action) =>
      action.payload?.type === "open_view" && action.payload?.deeplink === pageContext.deeplink,
    );
    if (!exists) {
      finalRich.next_actions = [
        {
          label: "Open this page",
          rationale: "Return to the current workspace view.",
          action_type: "open",
          payload: { type: "open_view", deeplink: pageContext.deeplink, label: "Open current page" },
        },
        ...finalRich.next_actions,
      ];
    }
  }
  finalRich.signal_strength = firewall.signal_strength;
  if (!finalRich.voice_summary) {
    const pending = finalRich.next_actions.find((a) => a.requires_confirmation);
    finalRich.voice_summary = pending
      ? `${finalRich.summary} Do you want me to ${pending.label.toLowerCase()}?`
      : finalRich.summary;
  }
  finalRich = applyPreferencesToRichResponse(finalRich, sessionPreferences);
  const voiceContext = buildVoiceContext({
    trace_id: trace.trace_id,
    intent: trace.intent,
    routing_path: trace.route.routing_path ?? "normal",
    preferences: sessionPreferences,
    page_label: pageContext?.view,
  });
  const shouldVoiceFrame =
    firewall.intent !== "locate" && (
    pendingWorkQuery ||
    selectedTools.includes("view.read") ||
    firewall.intent === "operational_query" ||
    firewall.intent === "governance_query" ||
    firewall.intent === "staffing" ||
    trace.route.routing_path === "connector_fallback"
    );
  // Skip voiceSummary prefix if reasoning assist will polish the response — it handles tone natively.
  // voiceSummary prefixes ("Right,", "Understood.") clash with reasoning assist's natural output.
  const reasoningAssistWillRun = shouldUseReasoningAssist({ routingPath: trace.route.routing_path });
  if (shouldVoiceFrame && !reasoningAssistWillRun) {
    finalRich.summary = voiceSummary(voiceContext, finalRich.summary);
    finalRich.voice_summary = voiceSummary(voiceContext, finalRich.voice_summary || finalRich.summary);
  }
  finalRich = applyPatternToRichResponse({
    rich: finalRich,
    trace_id: trace.trace_id,
    intent: trace.intent,
    routing_path: trace.route.routing_path ?? "normal",
    preferences: sessionPreferences,
  });

  const toolNamesForProvenance = firewall.executed_tools.length > 0 ? firewall.executed_tools : selectedTools;
  const usedFactCandidatesFromDataUsed = finalRich.data_used.flatMap((entry) => allowedFacts.by_source[entry.source] ?? []);
  let usedFactCandidates = [...usedFactCandidatesFromDataUsed];
  if (usedFactCandidates.length === 0) {
    if (!isSmalltalkOrUnsupported(firewall.intent) && toolNamesForProvenance.length > 0) {
      for (const toolName of toolNamesForProvenance) {
        usedFactCandidates.push(...(allowedFacts.by_source[`tool:${toolName}`] ?? []));
      }
      for (const evidenceEntry of firewall.evidence) {
        usedFactCandidates.push(...(allowedFacts.by_source[evidenceEntry.source] ?? []));
      }
    }
  }
  const usedFactIds = uniqueStableSubset(usedFactCandidates, allowedFacts.ids);

  const sectionFactIdsFor = (section: { heading: string; body: string; bullets: string[] }) => {
    const text = `${section.heading} ${section.body} ${section.bullets.join(" ")}`.toLowerCase();
    const sources: string[] = [];
    if (text.includes("staff") || text.includes("roster") || text.includes("rota")) {
      sources.push("tool:roster.staffing_summary", "Roster");
    }
    if (text.includes("ptl") || text.includes("waiting") || text.includes("patient") || text.includes("rtt")) {
      sources.push("tool:epr.ptl_summary", "EPR/PTL");
    }
    if (text.includes("alert")) {
      sources.push("tool:alerts.active", "TOM Alerts");
    }
    if (text.includes("anomal")) {
      sources.push("tool:anomalies.open", "TOM Anomaly Engine");
    }
    if (text.includes("referral")) {
      sources.push("tool:pas.referrals_summary", "PAS");
    }
    if (text.includes("comms") || text.includes("communication")) {
      sources.push("tool:comms.summary", "Comms");
    }

    const sectionCandidates = sources.flatMap((source) => allowedFacts.by_source[source] ?? []);
    return sectionCandidates.length > 0 ? uniqueStableSubset(sectionCandidates, allowedFacts.ids) : usedFactIds;
  };

  finalRich = {
    ...finalRich,
    provenance: { used_fact_ids: usedFactIds },
    sections: finalRich.sections.map((section) => ({
      ...section,
      used_fact_ids: sectionFactIdsFor(section),
    })),
  };

  const verification = verifyResponse({
    response: finalRich,
    evidence: finalRich.data_used,
    allowedFactIds: allowedFacts.ids,
    toolsUsed: selectedTools.length > 0,
    provenanceUsedFactIds: usedFactIds,
  });
  let outcomeStatus: "ok" | "fallback" | "blocked" = "ok";
  if (!verification.ok) {
    if (routingPath === "deep_reasoning") {
      const firstView = deepReasoningViewIds[0] || viewFinderSelectedIds[0] || pagesFirstViewId || "";
      const deeplink = firstView ? viewIdToDeeplink(firstView) : pageContext?.deeplink;
      finalRich = {
        title: "I need one detail before I can verify that",
        summary: "The page payload does not include enough verified fields for that claim. Do you want me to open the page or narrow the query?",
        voice_summary: "The page payload does not include enough verified fields for that claim. Do you want me to open the page or narrow the query?",
        sections: [
          {
            heading: "Verification",
            body: "I only respond with facts that are grounded in evidence.",
            bullets: verification.reasons.map((reason) => `Blocked: ${reason}`),
            used_fact_ids: [],
          },
        ],
        tables: [],
        next_actions: [
          ...(deeplink ? [{
            label: "Open checked page",
            rationale: "Review raw rows directly.",
            action_type: "open" as const,
            payload: { type: "open_view", deeplink, label: "Open page" },
          }] : []),
          {
            label: "Clarify field",
            rationale: "Specify the exact field to verify.",
            action_type: "ask",
            payload: { type: "clarify", kind: "missing_required_tool", choice: "which field should I verify?" },
          },
        ],
        context_cards: [],
        data_used: [],
        confidence: { level: "low", rationale: "Verifier blocked unsupported claims." },
        signal_strength: { level: "low", score: 5, rationale: "Insufficient evidence for requested claim." },
        provenance: { used_fact_ids: [] },
      };
    } else {
      finalRich = {
        ...applyPreferencesToRichResponse(deterministic, sessionPreferences),
        provenance: { used_fact_ids: usedFactIds },
        sections: deterministic.sections.map((section) => ({
          ...section,
          used_fact_ids: sectionFactIdsFor(section),
        })),
      };
    }
    outcomeStatus = "fallback";
  }
  finalRich = await maybeApplyReasoningAssist({
    trace,
    routing_path: trace.route.routing_path,
    rich: finalRich,
    usedFactIdsCount: usedFactIds.length,
  });
  finalRich = sanitizeRichForReturn(finalRich);
  if (routingPath === "deep_reasoning") {
    debugStage = "respond";
  }
  if (finalRich.next_actions.some((action) => action.payload?.type === "open_canvas")) {
    trace.constraints.push("canvas_opened:true");
  }
  const usedFactNote = `used_fact_ids:${usedFactIds.length}`;
  const noteParts = [...verification.reasons, usedFactNote];
  if (clarificationResolvedChoice) {
    noteParts.push(`clarification_resolved:${clarificationResolvedChoice}`);
  }
  trace.outcome = {
    status: outcomeStatus,
    notes: noteParts.join(","),
  };

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[tom.chat]", { intent: firewall.intent, llmUsed, verifier: verification.ok ? "pass" : "fail" });
  }

  const inferredLastTopic = (() => {
    if (selectedTools.includes("view.read")) {
      const viewId = (selectedToolInputs?.["view.read"]?.view_id as string | undefined)
        ?? (Array.isArray(selectedToolInputs?.["view.read"]?.view_ids) ? selectedToolInputs?.["view.read"]?.view_ids[0] : undefined)
        ?? viewFinderSelectedIds[0]
        ?? pagesFirstViewId
        ?? null;
      if (viewId) {
        const viewLabel = VIEW_REGISTRY.find((view) => view.id === viewId)?.label || viewId;
        return { kind: "view" as const, id: viewId, label: viewLabel, updated_at: new Date().toISOString() };
      }
    }
    if (trace.route.routing_path === "section_overview") {
      return { kind: "section" as const, id: "operations", label: "Section overview", updated_at: new Date().toISOString() };
    }
    return ctx.last_topic;
  })();
  const snapshotBlocks = finalRich.sections.filter((section) => section.type === "table");
  const nextLastSnapshot = snapshotBlocks.length > 0
    ? {
        title: finalRich.title || "Snapshot",
        blocks: snapshotBlocks,
        trace_id: trace.trace_id,
        updated_at: new Date().toISOString(),
      }
    : ctx.last_snapshot;
  const nextLastAnswerContext = explanationContext
    ? {
      trace_id: trace.trace_id,
      page_ids: explanationContext.page_type === "ptl"
        ? ["operations.ptl"]
        : explanationContext.page_type === "cancer_2ww"
          ? ["operations.cancer_2ww"]
          : explanationContext.page_type === "referrals"
            ? ["operations.referral_management"]
          : explanationContext.page_type === "triage"
            ? ["operations.triage_status"]
          : explanationContext.page_type === "breach_tracking"
            ? ["operations.breach_tracking"]
          : explanationContext.page_type === "pathway_milestones"
            ? ["operations.pathway_milestones"]
          : explanationContext.page_type === "clock_events"
            ? ["operations.clock_starts_stops"]
          : explanationContext.page_type === "data_quality"
            ? ["operations.validation_data_quality"]
          : explanationContext.page_type === "rtt"
            ? ["operations.access_pathways_rtt_monitoring"]
            : ["operations.access_pathways_waiting_list"],
      finding_type: explanationContext.finding_type,
      finding_summary: finalRich.summary.split("Checked:")[0].trim(),
      used_fact_ids: usedFactIds,
      updated_at: new Date().toISOString(),
    }
    : ctx.last_answer_context;

  updateContext(sessionId, {
    lastIntents: [...ctx.lastIntents.slice(-4), firewall.intent],
    lastSummary: finalRich.summary,
    last_routing_path: trace.route.routing_path,
    last_topic: inferredLastTopic,
    last_snapshot: nextLastSnapshot,
    last_answer_context: nextLastAnswerContext,
    pendingActions: finalRich.next_actions.map((a, idx) => ({
      ...a,
      action_id: (a as any).action_id || `act_${idx}_${Date.now()}`,
      requires_confirmation: a.action_type !== "open",
    })),
  });

  await logAudit({
    userId: "user",
    actionType: "chat",
    toolsCalled: reasoningAssistCalled
      ? [...firewall.executed_tools, "openai.reasoning_assist"]
      : firewall.executed_tools,
    recordsAccessed: [],
    outcome: "ok",
    correlationId: sessionId,
  });
  await persistTraceWithAssist(trace);

  const response = NextResponse.json(
    {
      response: finalRich.summary,
      rich: finalRich,
      sources: firewall.evidence.map((e) => e.source),
      topic: firewall.intent,
      trace_id: trace.trace_id,
      debug_routing_path: trace.route.routing_path,
      ...debugBase({ llmUsed: false }),
      allowed_facts: { count: allowedFacts.ids.length },
      provenance: { used_fact_ids: usedFactIds },
      trace: { trace_id: trace.trace_id, route: trace.route, outcome: trace.outcome },
    } satisfies ChatResponse,
  );
  if (!cookieSession) response.cookies.set("tom_session", sessionId, { path: "/" });
  return response;
}






