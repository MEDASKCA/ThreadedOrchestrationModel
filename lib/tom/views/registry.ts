import type { ViewSpec } from "./types";
import * as logisticsRosterShiftsReader from "./readers/logistics.roster_shifts";
import * as logisticsInventoryStockReader from "./readers/logistics.inventory_stock";
import * as logisticsTheatreScheduleReader from "./readers/logistics.theatre_schedule";
import * as operationsWaitingListReader from "./readers/operations.access_pathways_waiting_list";
import * as operationsRttMonitoringReader from "./readers/operations.access_pathways_rtt_monitoring";
import * as operationsPtlReader from "./readers/operations.ptl";
import * as operationsCancer2wwReader from "./readers/operations.cancer_2ww";
import * as operationsReferralManagementReader from "./readers/operations.referral_management";
import * as operationsTriageStatusReader from "./readers/operations.triage_status";
import * as operationsBreachTrackingReader from "./readers/operations.breach_tracking";
import * as operationsPathwayMilestonesReader from "./readers/operations.pathway_milestones";
import * as operationsClockStartsStopsReader from "./readers/operations.clock_starts_stops";
import * as operationsValidationDataQualityReader from "./readers/operations.validation_data_quality";
import * as planningSessionsReader from "./readers/planning.sessions";
import * as planningRosterShiftsReader from "./readers/planning.roster_shifts";
import * as collaborationDeliverablesReader from "./readers/collaboration.deliverables";
import * as collaborationForumReader from "./readers/collaboration.forum";
import * as intelligenceReader from "./readers/intelligence";
import * as capacityReader from "./readers/operations.capacity";
import * as activityReader from "./readers/operations.activity";
import * as proceduresReader from "./readers/operations.procedures";
import * as flowReader from "./readers/operations.flow";

const CORE_VIEWS: ViewSpec[] = [
  { id: "operations.ptl", section: "operations", label: "PTL", implemented: true, read: operationsPtlReader.read },
  { id: "operations.waiting", section: "operations", label: "Waiting (alias)", implemented: true, read: operationsWaitingListReader.read, notes: "Alias for access pathways waiting list." },
  { id: "operations.waiting_list_management", section: "operations", label: "Waiting List Management", implemented: true, read: operationsWaitingListReader.read, notes: "Alias for access pathways waiting list." },
  { id: "operations.rtt", section: "operations", label: "RTT (alias)", implemented: true, read: operationsRttMonitoringReader.read, notes: "Alias for access pathways RTT monitoring." },
  { id: "operations.access_pathways_waiting_list", section: "operations", label: "Access Pathways - Waiting List", implemented: true, read: operationsWaitingListReader.read },
  { id: "operations.access_pathways_rtt_monitoring", section: "operations", label: "Access Pathways - RTT Monitoring", implemented: true, read: operationsRttMonitoringReader.read },
  { id: "operations.cancer_2ww", section: "operations", label: "Cancer Pathways (2WW)", implemented: true, read: operationsCancer2wwReader.read },
  { id: "operations.cancer", section: "operations", label: "Cancer Pathways (2WW) (alias)", implemented: true, read: operationsCancer2wwReader.read, notes: "Alias for cancer 2WW view." },
  { id: "operations.referral_management", section: "operations", label: "Referral Management", implemented: true, read: operationsReferralManagementReader.read },
  { id: "operations.referrals", section: "operations", label: "Referral Management (alias)", implemented: true, read: operationsReferralManagementReader.read, notes: "Alias for referral management view." },
  { id: "operations.triage_status", section: "operations", label: "Triage Status", implemented: true, read: operationsTriageStatusReader.read },
  { id: "operations.triage", section: "operations", label: "Triage Status (alias)", implemented: true, read: operationsTriageStatusReader.read, notes: "Alias for triage status view." },
  { id: "operations.breach_tracking", section: "operations", label: "Breach Tracking", implemented: true, read: operationsBreachTrackingReader.read },
  { id: "operations.breach", section: "operations", label: "Breach Tracking (alias)", implemented: true, read: operationsBreachTrackingReader.read, notes: "Alias for breach tracking view." },
  { id: "operations.pathway_milestones", section: "operations", label: "Pathway Milestones", implemented: true, read: operationsPathwayMilestonesReader.read },
  { id: "operations.milestones", section: "operations", label: "Pathway Milestones (alias)", implemented: true, read: operationsPathwayMilestonesReader.read, notes: "Alias for pathway milestones view." },
  { id: "operations.clock_starts_stops", section: "operations", label: "Clock Starts / Stops", implemented: true, read: operationsClockStartsStopsReader.read },
  { id: "operations.clock", section: "operations", label: "Clock Starts / Stops (alias)", implemented: true, read: operationsClockStartsStopsReader.read, notes: "Alias for clock starts/stops view." },
  { id: "operations.validation_data_quality", section: "operations", label: "Validation & Data Quality", implemented: true, read: operationsValidationDataQualityReader.read },
  { id: "operations.validation", section: "operations", label: "Validation & Data Quality (alias)", implemented: true, read: operationsValidationDataQualityReader.read, notes: "Alias for validation/data quality view." },
  { id: "operations.access_metrics", section: "operations", label: "Access Pathways Metrics", implemented: false },
  { id: "operations.rtt_breaches", section: "operations", label: "RTT Breaches", implemented: false },

  // ── Capacity ──────────────────────────────────────────────────────────────
  { id: "operations.beds",            section: "operations", label: "Bed Management",             implemented: true, read: capacityReader.read_bed_management },
  { id: "operations.wardCapacity",    section: "operations", label: "Ward Capacity",               implemented: true, read: capacityReader.read_ward_capacity },
  { id: "operations.icuCapacity",     section: "operations", label: "ICU Capacity",                implemented: true, read: capacityReader.read_icu_capacity },
  { id: "operations.theatreCapacity", section: "operations", label: "Theatre Capacity",            implemented: true, read: capacityReader.read_theatre_capacity },
  { id: "operations.clinicSlots",     section: "operations", label: "Clinic Slot Availability",    implemented: true, read: capacityReader.read_clinic_slot_availability },
  { id: "operations.sessionPlanner",  section: "operations", label: "Session Planner",             implemented: true, read: capacityReader.read_session_planner },
  { id: "operations.templateUtil",    section: "operations", label: "Template Utilisation",        implemented: true, read: capacityReader.read_template_utilisation },
  { id: "operations.surge",           section: "operations", label: "Surge Planning",              implemented: true, read: capacityReader.read_surge_planning },
  { id: "operations.forwardCapacity", section: "operations", label: "7-Day Forward Capacity",      implemented: true, read: capacityReader.read_forward_capacity },

  // ── Activity & Performance ────────────────────────────────────────────────
  { id: "operations.dailyVsPlan",     section: "operations", label: "Daily Activity vs Plan",      implemented: true, read: activityReader.read_daily_activity_vs_plan },
  { id: "operations.theatreUtil",     section: "operations", label: "Theatre Utilisation",         implemented: true, read: activityReader.read_theatre_utilisation },
  { id: "operations.clinicUtil",      section: "operations", label: "Clinic Utilisation",          implemented: true, read: activityReader.read_clinic_utilisation },
  { id: "operations.dna",             section: "operations", label: "DNA Rates",                   implemented: true, read: activityReader.read_dna_rates },
  { id: "operations.cancellations",   section: "operations", label: "Cancellation Rates",          implemented: true, read: activityReader.read_cancellation_rates },
  { id: "operations.breachPerf",      section: "operations", label: "Breach Performance",          implemented: true, read: activityReader.read_breach_performance },
  { id: "operations.targets",         section: "operations", label: "Performance vs Targets",      implemented: true, read: activityReader.read_performance_vs_targets },
  { id: "operations.variance",        section: "operations", label: "Variance Analysis",           implemented: true, read: activityReader.read_variance_analysis },
  { id: "operations.specialtyPerf",   section: "operations", label: "Specialty Performance",       implemented: true, read: activityReader.read_specialty_performance },
  { id: "operations.solari",          section: "operations", label: "Solari Board",                implemented: true, read: activityReader.read_solari_board },

  // ── Procedures ────────────────────────────────────────────────────────────
  { id: "operations.opcs",            section: "operations", label: "OPCS Tracking",               implemented: true, read: proceduresReader.read_opcs_tracking },
  { id: "operations.procedureReqs",   section: "operations", label: "Procedure Requirements",      implemented: true, read: proceduresReader.read_procedure_requirements },
  { id: "operations.preop",           section: "operations", label: "Pre-Op Checklist Status",     implemented: true, read: proceduresReader.read_pre_op_checklist },
  { id: "operations.coding",          section: "operations", label: "Procedure Coding",            implemented: true, read: proceduresReader.read_procedure_coding },
  { id: "operations.durationTrends",  section: "operations", label: "Procedure Duration Trends",   implemented: true, read: proceduresReader.read_procedure_duration_trends },
  { id: "operations.theatreList",     section: "operations", label: "Theatre List Composition",    implemented: true, read: proceduresReader.read_theatre_list_composition },
  { id: "operations.backlog",         section: "operations", label: "Backlog by Procedure Type",   implemented: true, read: proceduresReader.read_backlog_by_procedure },

  // ── Flow & Escalation ─────────────────────────────────────────────────────
  { id: "operations.delayedDischarge",section: "operations", label: "Delayed Discharges",          implemented: true, read: flowReader.read_delayed_discharges },
  { id: "operations.transfers",       section: "operations", label: "Internal Transfers",          implemented: true, read: flowReader.read_internal_transfers },
  { id: "operations.blockedBeds",     section: "operations", label: "Blocked Beds",                implemented: true, read: flowReader.read_blocked_beds },
  { id: "operations.capacityAlerts",  section: "operations", label: "Capacity Alerts",             implemented: true, read: flowReader.read_capacity_alerts },
  { id: "operations.opel",            section: "operations", label: "Escalation Level (OPEL)",     implemented: true, read: flowReader.read_opel },
  { id: "operations.incidentFlags",   section: "operations", label: "Incident Flags",              implemented: true, read: flowReader.read_incident_flags },
  { id: "operations.emergency",       section: "operations", label: "Emergency Pressure Indicators",implemented: true, read: flowReader.read_emergency_pressure },
  { id: "operations.sameDayCancel",   section: "operations", label: "Same-Day Cancellations",      implemented: true, read: flowReader.read_same_day_cancellations },
  { id: "operations.riskFeed",        section: "operations", label: "Real-Time Risk Feed",         implemented: true, read: flowReader.read_risk_feed },

  { id: "logistics.roster_shifts", section: "logistics", label: "Roster Shifts", implemented: true, read: logisticsRosterShiftsReader.read },
  { id: "logistics.inventory_stock", section: "logistics", label: "Inventory Stock", implemented: true, read: logisticsInventoryStockReader.read },
  { id: "logistics.theatre_schedule", section: "logistics", label: "Theatre Schedule", implemented: true, read: logisticsTheatreScheduleReader.read, notes: "Fixture-backed." },
  { id: "logistics.bed_capacity", section: "logistics", label: "Bed Capacity", implemented: false },

  { id: "planning.sessions", section: "planning", label: "Planning Sessions", implemented: true, read: planningSessionsReader.read },
  { id: "planning.roster_shifts", section: "planning", label: "Roster Shifts (Planning)", implemented: true, read: planningRosterShiftsReader.read },

  { id: "collaboration.deliverables", section: "collaboration", label: "Deliverables", implemented: true, read: collaborationDeliverablesReader.read },
  { id: "collaboration.forum", section: "collaboration", label: "Forum", implemented: true, read: collaborationForumReader.read },
  { id: "collaboration.threads", section: "collaboration", label: "Threads", implemented: false },

  { id: "intelligence.overview", section: "intelligence", label: "Intelligence Overview", implemented: true, read: intelligenceReader.read, notes: "Theatre performance, utilisation metrics, and audit events." },
  { id: "intelligence.audit_log", section: "intelligence", label: "Audit Log", implemented: true, read: intelligenceReader.read, notes: "Access and activity audit events from Firestore." },
  { id: "intelligence.theatre_lists", section: "intelligence", label: "Theatre Lists", implemented: true, read: intelligenceReader.read, notes: "Theatre schedule performance data." },

  { id: "settings.hospitals", section: "settings", label: "Hospitals", implemented: false },
  { id: "settings.connectors", section: "settings", label: "Connectors", implemented: false },

  { id: "chat.overview", section: "chat", label: "Chat Overview", implemented: false },
];

const OPERATIONS_PAGE_CATALOG: Array<{ key: string; label: string }> = [
  { key: "ptl", label: "PTL (Patient Tracking List)" },
  { key: "waiting", label: "Waiting List Management" },
  { key: "rtt", label: "RTT Monitoring" },
  { key: "cancer", label: "Cancer Pathways (2WW)" },
  { key: "referrals", label: "Referral Management" },
  { key: "triage", label: "Triage Status" },
  { key: "breach", label: "Breach Tracking" },
  { key: "milestones", label: "Pathway Milestones" },
  { key: "clock", label: "Clock Starts / Stops" },
  { key: "validation", label: "Validation & Data Quality" },
  { key: "beds", label: "Bed Management" },
  { key: "wardCapacity", label: "Ward Capacity" },
  { key: "icuCapacity", label: "ICU Capacity" },
  { key: "theatreCapacity", label: "Theatre Capacity" },
  { key: "clinicSlots", label: "Clinic Slot Availability" },
  { key: "sessionPlanner", label: "Session Planner" },
  { key: "templateUtil", label: "Template Utilisation" },
  { key: "surge", label: "Surge Planning" },
  { key: "forwardCapacity", label: "7-Day Forward Capacity View" },
  { key: "dailyVsPlan", label: "Daily Activity vs Plan" },
  { key: "theatreUtil", label: "Theatre Utilisation" },
  { key: "clinicUtil", label: "Clinic Utilisation" },
  { key: "dna", label: "DNA Rates" },
  { key: "cancellations", label: "Cancellation Rates" },
  { key: "breachPerf", label: "Breach Performance" },
  { key: "targets", label: "Performance vs Targets" },
  { key: "variance", label: "Variance Analysis" },
  { key: "specialtyPerf", label: "Specialty Performance View" },
  { key: "solari", label: "Solari Board (Live Operational Dashboard)" },
  { key: "opcs", label: "OPSC Tracking" },
  { key: "procedureReqs", label: "Procedure Requirements" },
  { key: "preop", label: "Pre-Op Checklist Status" },
  { key: "coding", label: "Procedure Coding" },
  { key: "durationTrends", label: "Procedure Duration Trends" },
  { key: "theatreList", label: "Theatre List Composition" },
  { key: "backlog", label: "Backlog by Procedure Type" },
  { key: "delayedDischarge", label: "Delayed Discharges" },
  { key: "transfers", label: "Internal Transfers" },
  { key: "blockedBeds", label: "Blocked Beds" },
  { key: "capacityAlerts", label: "Capacity Alerts" },
  { key: "opel", label: "Escalation Level (OPEL-style view)" },
  { key: "incidentFlags", label: "Incident Flags" },
  { key: "emergency", label: "Emergency Pressure Indicators" },
  { key: "sameDayCancel", label: "Same-Day Cancellations" },
  { key: "riskFeed", label: "Real-Time Risk Feed" },
];

const LOGISTICS_PAGE_CATALOG: Array<{ key: string; label: string }> = [
  { key: "roster", label: "Roster" },
  { key: "allocation", label: "Allocation" },
  { key: "fte", label: "FTE Management" },
  { key: "staffFinder", label: "Staff Finder" },
  { key: "shifts", label: "Shift Management" },
  { key: "absence", label: "Absence Tracking" },
  { key: "catalogue", label: "Product Catalogue" },
  { key: "equipment", label: "Equipment Register" },
  { key: "assetTrack", label: "Asset Tracking" },
  { key: "procurement", label: "Procurement Requests" },
  { key: "specs", label: "Product Specifications" },
  { key: "suppliers", label: "Supplier Information" },
  { key: "stockLevels", label: "Stock Levels" },
  { key: "warehousing", label: "Warehousing" },
  { key: "distribution", label: "Distribution" },
  { key: "returns", label: "Returns" },
  { key: "expiry", label: "Expiry & Batch Tracking" },
  { key: "stockAdj", label: "Stock Adjustments" },
  { key: "assetMove", label: "Asset Movement Tracking" },
  { key: "staffCoverage", label: "Staff Coverage" },
  { key: "equipmentCoverage", label: "Equipment Coverage" },
  { key: "spaceCoverage", label: "Space/Room Coverage" },
  { key: "coverageRisk", label: "Coverage Risk" },
  { key: "coverageTimeline", label: "Today / Tomorrow / 7-day view" },
];

const PLANNING_PAGE_CATALOG: Array<{ key: string; label: string }> = [
  { key: "roster", label: "Roster" },
  { key: "schedule", label: "Schedule" },
  { key: "workforce", label: "Workforce" },
  { key: "staff_allocation", label: "Staff Allocation" },
];

const COLLAB_PAGE_CATALOG: Array<{ key: string; label: string }> = [
  { key: "forum_all_threads", label: "Forum - All Threads" },
  { key: "forum_by_topic", label: "Forum - By Category" },
  { key: "forum_trending", label: "Forum - Trending" },
  { key: "forum_pinned", label: "Forum - Pinned / Announcements" },
  { key: "deliverables_my", label: "Deliverables - My Deliverables" },
  { key: "deliverables_team", label: "Deliverables - Team Deliverables" },
  { key: "deliverables_at_risk", label: "Deliverables - At Risk" },
  { key: "deliverables_overdue", label: "Deliverables - Overdue" },
  { key: "escalations_active", label: "Escalations - Active" },
  { key: "escalations_breaches", label: "Escalations - Breaches" },
  { key: "escalations_critical", label: "Escalations - Critical" },
  { key: "my_assigned", label: "My Work - Assigned to Me" },
  { key: "my_awaiting", label: "My Work - Awaiting My Response" },
  { key: "brief_today", label: "Huddle & Briefing - Today" },
  { key: "brief_7day", label: "Huddle & Briefing - 7-Day Forward" },
  { key: "brief_risks", label: "Huddle & Briefing - Auto-Risks" },
  { key: "governance_activity", label: "Governance Log - Activity Feed" },
  { key: "governance_audit", label: "Governance Log - Audit Log" },
];

const INTELLIGENCE_PAGE_CATALOG: Array<{ key: string; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "analytics", label: "Analytics" },
  { key: "reports", label: "Reports" },
  { key: "audit_logs", label: "Audit Logs" },
  { key: "tom_audit", label: "TOM Audit" },
];

const SETTINGS_PAGE_CATALOG: Array<{ key: string; label: string }> = [
  { key: "hospitals", label: "Hospitals" },
  { key: "procedures", label: "Procedures" },
  { key: "permissions", label: "Permissions" },
  { key: "integrations", label: "Integrations" },
  { key: "profile", label: "Profile" },
];

const catalogToViews = (
  section: string,
  catalog: Array<{ key: string; label: string }>,
): ViewSpec[] => catalog.map((item) => ({
  id: `${section}.${item.key}`,
  section,
  label: item.label,
  implemented: false,
  notes: "Catalogued from section navigation for deterministic view awareness.",
}));

const mergeUniqueViews = (views: ViewSpec[]): ViewSpec[] => {
  const byId = new Map<string, ViewSpec>();
  for (const view of views) {
    if (!byId.has(view.id)) {
      byId.set(view.id, view);
      continue;
    }
    const existing = byId.get(view.id)!;
    if (!existing.implemented && view.implemented) {
      byId.set(view.id, view);
    }
  }
  return Array.from(byId.values());
};

export const VIEW_REGISTRY: ViewSpec[] = mergeUniqueViews([
  ...CORE_VIEWS,
  ...catalogToViews("operations", OPERATIONS_PAGE_CATALOG),
  ...catalogToViews("logistics", LOGISTICS_PAGE_CATALOG),
  ...catalogToViews("planning", PLANNING_PAGE_CATALOG),
  ...catalogToViews("collaboration", COLLAB_PAGE_CATALOG),
  ...catalogToViews("intelligence", INTELLIGENCE_PAGE_CATALOG),
  ...catalogToViews("settings", SETTINGS_PAGE_CATALOG),
]);

export const getViewById = (id: string) => VIEW_REGISTRY.find((view) => view.id === id) ?? null;
