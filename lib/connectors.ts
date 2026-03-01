// ─── TYPES ────────────────────────────────────────────────────────────────────

export type ConnectorState =
  | "not_connected"
  | "sandbox"
  | "production"
  | "configuring"
  | "issues"
  | "degraded"
  | "suspended";

export type Environment = "sandbox" | "uat" | "production";
export type DataDirection = "inbound" | "outbound" | "bidirectional";

export type DataFlow = {
  domain: string;
  direction: DataDirection;
};

export type ActivityEvent = {
  time: string;
  event: string;
  level: "info" | "warn" | "error";
};

export type PlatformModule = {
  id: string;
  name: string;
  description: string;
  status: ConnectorState;
  lastSync?: string;
  errorCount: number;
  dataFlows: DataFlow[];
  apiEndpoints: string[];
  activityLog: ActivityEvent[];
};

export type CapabilitySurface =
  | "operations"
  | "logistics"
  | "collaboration"
  | "intelligence"
  | "apps"
  | "configurator"
  | "settings";

export type Capability = {
  id: string;
  label: string;
  surface: CapabilitySurface[];
  description: string;
  /** PlatformModule.id that provides this capability. If set, level derives from the module's status. */
  module?: string;
};

export type Platform = {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  initials: string;
  vendor?: string;
  apiType?: string;
  environment: Environment;
  linkedPlatformModules?: string[];
  modules: PlatformModule[];
  flatStatus?: ConnectorState;
  lastSync?: string;
  capabilities?: Capability[];
};

// ─── FUNCTIONS ────────────────────────────────────────────────────────────────

export function getPlatformStatus(p: Platform): ConnectorState {
  if (p.modules.length === 0) return p.flatStatus ?? "not_connected";
  const s = p.modules.map(m => m.status);
  if (s.some(x => x === "suspended")) return "suspended";
  if (s.some(x => x === "issues")) return "issues";
  if (s.some(x => x === "degraded")) return "degraded";
  if (s.every(x => x === "production")) return "production";
  if (s.some(x => x === "production" || x === "sandbox")) return "sandbox";
  if (s.some(x => x === "configuring")) return "configuring";
  return "not_connected";
}

export function getLifecycleStep(status: ConnectorState): number {
  switch (status) {
    case "not_connected": return 0;
    case "configuring":   return 1;
    case "sandbox":       return 3;
    case "production":    return 6;
    case "issues":
    case "degraded":
    case "suspended":     return 4;
  }
}

export const LIFECYCLE_STAGES = [
  "Discover",
  "Enable Sandbox",
  "Validate Flows",
  "Module Testing",
  "Health Monitor",
  "Promote",
  "Live",
] as const;

export function getPlatformStats(list: Platform[]) {
  return {
    total: list.length,
    production:   list.filter(p => getPlatformStatus(p) === "production").length,
    sandbox:      list.filter(p => getPlatformStatus(p) === "sandbox").length,
    configuring:  list.filter(p => getPlatformStatus(p) === "configuring").length,
    issues:       list.filter(p => getPlatformStatus(p) === "issues").length,
    not_connected: list.filter(p =>
      !["production", "sandbox", "configuring", "issues"].includes(getPlatformStatus(p))
    ).length,
  };
}

// ─── CAPABILITY REGISTRY ──────────────────────────────────────────────────────

/** Activation level for a capability based on its connector/module status. */
export type CapabilityLevel = "active" | "sandbox" | "inactive";

export type CapabilityProjection = {
  capability: Capability;
  platform: Platform;
  level: CapabilityLevel;
};

/**
 * Resolves the activation level of a specific capability.
 * - active   → connector/module is production or issues (live but impaired)
 * - sandbox  → connector/module is sandbox or configuring (in test/setup)
 * - inactive → not yet connected
 */
export function getCapabilityLevel(platform: Platform, capability: Capability): CapabilityLevel {
  if (capability.module) {
    const mod = platform.modules.find(m => m.id === capability.module);
    if (!mod) return "inactive";
    if (mod.status === "production" || mod.status === "issues" || mod.status === "degraded") return "active";
    if (mod.status === "sandbox" || mod.status === "configuring") return "sandbox";
    return "inactive";
  }
  const status = getPlatformStatus(platform);
  if (status === "production" || status === "issues" || status === "degraded") return "active";
  if (status === "sandbox" || status === "configuring") return "sandbox";
  return "inactive";
}

/**
 * Returns all capability projections for a given surface.
 * Pass `activeOnly: true` to exclude inactive capabilities.
 */
export function getCapabilitiesForSurface(
  list: Platform[],
  surface: CapabilitySurface,
  options?: { activeOnly?: boolean },
): CapabilityProjection[] {
  const out: CapabilityProjection[] = [];
  for (const platform of list) {
    for (const capability of platform.capabilities ?? []) {
      if (!capability.surface.includes(surface)) continue;
      const level = getCapabilityLevel(platform, capability);
      if (options?.activeOnly && level === "inactive") continue;
      out.push({ capability, platform, level });
    }
  }
  return out;
}

/**
 * Returns the full capability registry keyed by surface.
 * This is the runtime source of truth for what each experience surface can display.
 */
export function getCapabilityRegistry(list: Platform[]): Record<CapabilitySurface, CapabilityProjection[]> {
  const surfaces: CapabilitySurface[] = [
    "operations", "logistics", "collaboration", "intelligence", "apps", "configurator", "settings",
  ];
  return Object.fromEntries(
    surfaces.map(s => [s, getCapabilitiesForSurface(list, s)])
  ) as Record<CapabilitySurface, CapabilityProjection[]>;
}

export const CATEGORIES = [
  "All",
  "Primary Care",
  "Acute & Secondary",
  "Referrals & Pathways",
  "Urgent & Emergency",
  "Mental Health",
  "Pharmacy",
  "Workforce",
  "Patient Apps",
  "Reporting & Incident",
  "Identity & Access",
  "Interoperability",
] as const;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const NC_LOG: ActivityEvent[] = [
  { time: "—", event: "Not connected — awaiting configuration", level: "info" },
];

function nc(id: string, name: string, desc: string, flows: DataFlow[], endpoints: string[]): PlatformModule {
  return { id, name, description: desc, status: "not_connected", errorCount: 0, dataFlows: flows, apiEndpoints: endpoints, activityLog: NC_LOG };
}

// ─── PLATFORMS ────────────────────────────────────────────────────────────────

export const platforms: Platform[] = [

  // ── PRIMARY CARE ─────────────────────────────────────────────────────────────

  {
    id: "emis",
    name: "EMIS Web",
    category: "Primary Care",
    description: "GP clinical system — patient records, prescriptions, appointments.",
    color: "#003087",
    initials: "EMIS",
    vendor: "EMIS Health",
    apiType: "REST / EMIS API",
    environment: "sandbox",
    linkedPlatformModules: ["Operations", "Planning", "Intelligence"],
    modules: [
      nc("emis-clinical", "Clinical Records", "Patient clinical records, consultation notes, and Read codes", [
        { domain: "Patient demographics", direction: "inbound" },
        { domain: "Clinical notes", direction: "inbound" },
        { domain: "Read codes", direction: "inbound" },
      ], ["/emis/patients", "/emis/consultations", "/emis/codes"]),
      nc("emis-prescribing", "Prescribing", "Electronic prescriptions and medication history", [
        { domain: "Prescriptions", direction: "outbound" },
        { domain: "Medication history", direction: "inbound" },
      ], ["/emis/prescriptions", "/emis/medications"]),
      nc("emis-appointments", "Appointments", "GP appointment slots, bookings, and attendance records", [
        { domain: "Appointment slots", direction: "bidirectional" },
        { domain: "Attendance records", direction: "inbound" },
      ], ["/emis/slots", "/emis/appointments"]),
      nc("emis-reporting", "Reporting", "QOF data, population health extracts, and clinical reports", [
        { domain: "QOF data", direction: "inbound" },
        { domain: "Population reports", direction: "inbound" },
      ], ["/emis/reports/qof", "/emis/reports/population"]),
    ],
    capabilities: [
      { id: "gp_records",            label: "GP Clinical Records",   surface: ["operations"],              description: "Primary care patient records and consultation history",  module: "emis-clinical"      },
      { id: "gp_prescriptions",      label: "GP Prescriptions",      surface: ["logistics"],               description: "GP prescriptions and medication history",                module: "emis-prescribing"   },
      { id: "gp_appointments",       label: "GP Appointments",       surface: ["logistics"],               description: "GP appointment slots and attendance data",               module: "emis-appointments"  },
      { id: "population_reporting",  label: "Population Reporting",  surface: ["intelligence"],            description: "QOF and population health extracts",                     module: "emis-reporting"     },
    ],
  },

  {
    id: "systmone",
    name: "SystmOne",
    category: "Primary Care",
    description: "Clinical records, care pathways, and patient management across GP practices.",
    color: "#DC143C",
    initials: "S1",
    vendor: "TPP",
    apiType: "TPP API",
    environment: "sandbox",
    linkedPlatformModules: ["Operations", "Intelligence"],
    modules: [
      nc("s1-clinical", "Clinical Records", "Patient records, clinical notes, and care pathways", [
        { domain: "Patient records", direction: "inbound" },
        { domain: "Clinical notes", direction: "inbound" },
      ], ["/tpp/patients", "/tpp/clinical"]),
      nc("s1-referrals", "Referrals", "Referral letters and pathway tracking", [
        { domain: "Referral letters", direction: "outbound" },
        { domain: "Pathway status", direction: "inbound" },
      ], ["/tpp/referrals"]),
      nc("s1-tasks", "Task Management", "Clinical tasks, reminders, and workflow management", [
        { domain: "Clinical tasks", direction: "bidirectional" },
      ], ["/tpp/tasks"]),
    ],
    capabilities: [
      { id: "s1_clinical_records", label: "Clinical Records", surface: ["operations"],              description: "SystmOne patient records and clinical notes",   module: "s1-clinical"  },
      { id: "s1_referrals",        label: "Referrals",        surface: ["operations"],              description: "Referral letters and pathway tracking",          module: "s1-referrals" },
      { id: "s1_tasks",            label: "Task Management",  surface: ["collaboration"],           description: "Clinical tasks and workflow management",         module: "s1-tasks"     },
    ],
  },

  {
    id: "vision",
    name: "Vision (INPS)",
    category: "Primary Care",
    description: "Integrated primary care clinical system used across GP surgeries.",
    color: "#7C3AED",
    initials: "VIS",
    vendor: "INPS",
    apiType: "Vision API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "ardens",
    name: "Ardens",
    category: "Primary Care",
    description: "Clinical decision support and templates for EMIS and SystmOne.",
    color: "#0369A1",
    initials: "ARD",
    vendor: "Ardens",
    apiType: "EMIS / TPP plugin",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "accurx",
    name: "AccuRx",
    category: "Primary Care",
    description: "Patient messaging, video consultations, and task management for GP teams.",
    color: "#059669",
    initials: "ACX",
    vendor: "AccuRx",
    apiType: "AccuRx API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "iplato",
    name: "iPlato / MJog",
    category: "Primary Care",
    description: "Patient engagement — appointment reminders, recalls, and notifications.",
    color: "#B45309",
    initials: "MJG",
    vendor: "iPlato",
    apiType: "iPlato API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "patchs",
    name: "Patchs",
    category: "Primary Care",
    description: "Online consultation and triage tool for GP practices.",
    color: "#2563EB",
    initials: "PTH",
    vendor: "Patchs Health",
    apiType: "Patchs API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "askfirst",
    name: "AskFirst",
    category: "Primary Care",
    description: "Digital triage and patient access management for primary care.",
    color: "#7C3AED",
    initials: "ASK",
    vendor: "Inhealthcare",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "docman",
    name: "Docman",
    category: "Primary Care",
    description: "GP document management — letters, discharge summaries, referrals.",
    color: "#065F46",
    initials: "DCM",
    vendor: "Docman",
    apiType: "Docman API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "ice",
    name: "ICE (Sunquest)",
    category: "Primary Care",
    description: "Integrated clinical environment for lab test requesting and results.",
    color: "#0891B2",
    initials: "ICE",
    vendor: "Clinisys",
    apiType: "HL7 / REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── ACUTE & SECONDARY ────────────────────────────────────────────────────────

  {
    id: "cerner",
    name: "Cerner Millennium",
    category: "Acute & Secondary",
    description: "Enterprise EPR — orders, clinical notes, scheduling, and patient admin.",
    color: "#EA580C",
    initials: "CRN",
    vendor: "Oracle Health",
    apiType: "FHIR R4 / Cerner API",
    environment: "sandbox",
    linkedPlatformModules: ["Operations", "Planning", "Intelligence"],
    modules: [
      {
        id: "cerner-pas",
        name: "PAS",
        description: "Patient Administration System — ADT events, demographics, ward movements",
        status: "sandbox",
        lastSync: "8 min ago",
        errorCount: 0,
        dataFlows: [
          { domain: "Patient demographics", direction: "inbound" },
          { domain: "ADT events",           direction: "inbound" },
          { domain: "Appointments",          direction: "bidirectional" },
        ],
        apiEndpoints: [
          "/millenniumfhir/r4/Patient",
          "/millenniumfhir/r4/Encounter",
          "/millenniumfhir/r4/Appointment",
        ],
        activityLog: [
          { time: "8 min ago",  event: "ADT A01 received — patient admitted Ward 4B",       level: "info" },
          { time: "22 min ago", event: "Demographics sync completed (47 records)",             level: "info" },
          { time: "1 hr ago",   event: "OAuth token refreshed",                               level: "info" },
          { time: "3 hrs ago",  event: "Sandbox environment activated",                       level: "info" },
        ],
      },
      {
        id: "cerner-powerchart",
        name: "PowerChart",
        description: "Clinical documentation — notes, orders, results, and task management",
        status: "configuring",
        errorCount: 0,
        dataFlows: [
          { domain: "Clinical notes", direction: "inbound" },
          { domain: "Orders",         direction: "inbound" },
          { domain: "Results",        direction: "inbound" },
        ],
        apiEndpoints: [
          "/millenniumfhir/r4/DocumentReference",
          "/millenniumfhir/r4/ServiceRequest",
          "/millenniumfhir/r4/Observation",
        ],
        activityLog: [
          { time: "2 hrs ago", event: "API credentials submitted for review", level: "info" },
          { time: "3 hrs ago", event: "Configuration wizard started",          level: "info" },
        ],
      },
      {
        id: "cerner-epma",
        name: "ePMA",
        description: "Electronic Prescribing and Medicines Administration",
        status: "configuring",
        errorCount: 0,
        dataFlows: [
          { domain: "Prescriptions",    direction: "inbound" },
          { domain: "Administrations",  direction: "inbound" },
        ],
        apiEndpoints: [
          "/millenniumfhir/r4/MedicationRequest",
          "/millenniumfhir/r4/MedicationAdministration",
        ],
        activityLog: [
          { time: "1 hr ago", event: "Awaiting ePMA API credentials from pharmacy team", level: "warn" },
        ],
      },
      nc("cerner-theatre", "Theatre Manager", "Theatre session scheduling, case booking, and surgical teams", [
        { domain: "Theatre sessions", direction: "inbound" },
        { domain: "Surgical cases",   direction: "inbound" },
        { domain: "Staff assignments", direction: "inbound" },
      ], ["/millenniumfhir/r4/Schedule", "/millenniumfhir/r4/Slot"]),
      nc("cerner-caremanager", "CareManager", "Care plans, clinical tasks, and multidisciplinary team workflows", [
        { domain: "Care plans",    direction: "bidirectional" },
        { domain: "Clinical tasks", direction: "inbound" },
      ], ["/millenniumfhir/r4/CarePlan", "/millenniumfhir/r4/Task"]),
    ],
    capabilities: [
      { id: "cerner_patient_admin",    label: "Patient Administration",    surface: ["operations"],               description: "ADT events, demographics, bed movements via PAS",             module: "cerner-pas"         },
      { id: "cerner_clinical_records", label: "Clinical Records",          surface: ["operations"],               description: "Clinical notes, orders, and results via PowerChart",          module: "cerner-powerchart"  },
      { id: "cerner_theatre",          label: "Theatre Scheduling",        surface: ["operations", "logistics"],  description: "Theatre sessions, case booking, and surgical team assignments", module: "cerner-theatre"     },
      { id: "cerner_opcs",             label: "Procedure Codes (OPCS)",    surface: ["logistics"],                description: "Surgical procedure codes for HRG grouping and costing",       module: "cerner-theatre"     },
      { id: "cerner_epma",             label: "Medication Management",     surface: ["logistics"],                description: "ePMA prescribing and administration records",                 module: "cerner-epma"        },
      { id: "cerner_care_plans",       label: "Care Plans",                surface: ["operations"],               description: "MDT care plans and clinical task management",                 module: "cerner-caremanager" },
      { id: "cerner_activity_data",    label: "Clinical Activity Data",    surface: ["intelligence"],             description: "Theatre utilisation, case duration, and clinical activity"                              },
      { id: "cerner_event_alerts",     label: "Clinical Event Alerts",     surface: ["collaboration", "configurator"], description: "Cerner-triggered alerts for escalation and automated workflows"                    },
    ],
  },

  {
    id: "epic",
    name: "Epic",
    category: "Acute & Secondary",
    description: "Integrated EHR with native FHIR R4 APIs and comprehensive clinical modules.",
    color: "#B91C1C",
    initials: "EPC",
    vendor: "Epic Systems",
    apiType: "FHIR R4",
    environment: "sandbox",
    linkedPlatformModules: ["Operations", "Planning", "Intelligence"],
    modules: [
      nc("epic-hyperspace", "Hyperspace", "Core EHR — patient chart, clinical workflow, and documentation", [
        { domain: "Patient chart",     direction: "inbound" },
        { domain: "Clinical workflow", direction: "bidirectional" },
      ], ["/api/FHIR/R4/Patient", "/api/FHIR/R4/Encounter"]),
      nc("epic-cadence", "Cadence", "Scheduling — outpatient appointments and resource management", [
        { domain: "Appointments",    direction: "bidirectional" },
        { domain: "Provider slots",  direction: "inbound" },
      ], ["/api/FHIR/R4/Appointment", "/api/FHIR/R4/Schedule"]),
      nc("epic-optime", "OpTime", "Surgical scheduling, OR management, and case documentation", [
        { domain: "Surgical cases",  direction: "inbound" },
        { domain: "OR schedules",    direction: "inbound" },
      ], ["/api/FHIR/R4/Procedure", "/api/FHIR/R4/ServiceRequest"]),
      nc("epic-willow", "Willow", "Pharmacy management — dispensing, medication verification, and MAR", [
        { domain: "Medications",      direction: "inbound" },
        { domain: "Dispense records", direction: "inbound" },
      ], ["/api/FHIR/R4/MedicationRequest", "/api/FHIR/R4/MedicationDispense"]),
      nc("epic-beaker", "Beaker", "Laboratory information system — orders, results, and specimen tracking", [
        { domain: "Lab orders",   direction: "inbound" },
        { domain: "Lab results",  direction: "inbound" },
      ], ["/api/FHIR/R4/ServiceRequest", "/api/FHIR/R4/Observation"]),
    ],
    capabilities: [
      { id: "epic_patient_chart",  label: "Patient Chart",          surface: ["operations"],              description: "Hyperspace clinical chart and documentation", module: "epic-hyperspace" },
      { id: "epic_surgical",       label: "Surgical Scheduling",    surface: ["operations", "logistics"], description: "OpTime OR management and surgical case scheduling", module: "epic-optime"    },
      { id: "epic_appointments",   label: "Appointment Management", surface: ["logistics"],               description: "Cadence outpatient scheduling and slot management", module: "epic-cadence"  },
      { id: "epic_pharmacy",       label: "Pharmacy Management",    surface: ["logistics"],               description: "Willow dispensing, MAR, and medication verification", module: "epic-willow" },
      { id: "epic_lab",            label: "Lab Results",            surface: ["operations"],              description: "Beaker lab orders and clinical results", module: "epic-beaker"             },
    ],
  },

  {
    id: "allscripts",
    name: "Allscripts / Altera",
    category: "Acute & Secondary",
    description: "Clinical management, patient care coordination, and analytics.",
    color: "#1D4ED8",
    initials: "ALS",
    vendor: "Altera Digital Health",
    apiType: "REST / HL7",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "lorenzo",
    name: "Lorenzo",
    category: "Acute & Secondary",
    description: "NHS acute EPR — patient admin, clinical documentation, and workflows.",
    color: "#005EB8",
    initials: "LRZ",
    vendor: "DXC Technology",
    apiType: "Lorenzo API / HL7",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "meditech",
    name: "Meditech",
    category: "Acute & Secondary",
    description: "Hospital information system — clinical, financial, and operational data.",
    color: "#0C4A6E",
    initials: "MDT",
    vendor: "Meditech",
    apiType: "FHIR R4 / REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "careflow",
    name: "DXC CareFlow",
    category: "Acute & Secondary",
    description: "Patient flow and bed management for acute NHS trusts.",
    color: "#9F1239",
    initials: "DXC",
    vendor: "DXC Technology",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  {
    id: "pacs",
    name: "PACS",
    category: "Acute & Secondary",
    description: "Picture Archiving and Communication System for radiology images.",
    color: "#374151",
    initials: "PAC",
    vendor: "Various (Sectra, Agfa, Philips)",
    apiType: "DICOM / REST",
    environment: "production",
    linkedPlatformModules: ["Operations", "Intelligence"],
    modules: [
      {
        id: "pacs-dicom",
        name: "DICOM Store",
        description: "Stores and retrieves DICOM imaging studies from modalities",
        status: "production",
        lastSync: "2 min ago",
        errorCount: 0,
        dataFlows: [
          { domain: "DICOM studies",   direction: "inbound" },
          { domain: "Series metadata", direction: "inbound" },
          { domain: "Archive requests", direction: "outbound" },
        ],
        apiEndpoints: ["/wado/rs/studies", "/stow/rs/studies", "/qido/rs/studies"],
        activityLog: [
          { time: "2 min ago",  event: "C-STORE received — CT abdomen (3 series)", level: "info" },
          { time: "8 min ago",  event: "Study archived — MRI brain",               level: "info" },
          { time: "1 hr ago",   event: "Modality worklist sync completed",          level: "info" },
        ],
      },
      {
        id: "pacs-viewer",
        name: "Viewer",
        description: "Web-based DICOM viewer for clinical reporting and review",
        status: "production",
        lastSync: "5 min ago",
        errorCount: 0,
        dataFlows: [
          { domain: "Study metadata",  direction: "inbound" },
          { domain: "Viewport state",  direction: "outbound" },
        ],
        apiEndpoints: ["/viewer/launch", "/viewer/worklist"],
        activityLog: [
          { time: "5 min ago",  event: "Viewer session opened — chest X-ray review", level: "info" },
          { time: "30 min ago", event: "3 active radiologist sessions",               level: "info" },
        ],
      },
      {
        id: "pacs-reporting",
        name: "Reporting",
        description: "Radiology report generation, signing, and distribution via HL7",
        status: "issues",
        lastSync: "3 hrs ago",
        errorCount: 3,
        dataFlows: [
          { domain: "Radiology reports", direction: "outbound" },
          { domain: "RIS order data",    direction: "inbound" },
        ],
        apiEndpoints: ["/reports/create", "/reports/distribute", "/reports/sign"],
        activityLog: [
          { time: "3 hrs ago", event: "Report distribution failed — HL7 endpoint timeout", level: "error" },
          { time: "4 hrs ago", event: "Report signed by radiologist (2 reports)",           level: "info"  },
          { time: "5 hrs ago", event: "HL7 connection intermittent — retrying (attempt 3)", level: "warn"  },
        ],
      },
    ],
    capabilities: [
      { id: "imaging",            label: "Medical Imaging",     surface: ["operations"],              description: "DICOM radiology images and study access",             module: "pacs-dicom"     },
      { id: "dicom_viewer",       label: "DICOM Viewer",        surface: ["apps"],                    description: "Web-based radiology image review tool",              module: "pacs-viewer"    },
      { id: "radiology_reports",  label: "Radiology Reports",   surface: ["operations", "intelligence"], description: "Report generation, signing, and distribution",    module: "pacs-reporting" },
    ],
  },

  {
    id: "ris",
    name: "RIS",
    category: "Acute & Secondary",
    description: "Radiology Information System — exam scheduling, reporting, and tracking.",
    color: "#4B5563",
    initials: "RIS",
    vendor: "Various",
    apiType: "HL7 / REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "winpath",
    name: "Clinisys WinPath",
    category: "Acute & Secondary",
    description: "Laboratory information system for pathology and diagnostic services.",
    color: "#0369A1",
    initials: "WIN",
    vendor: "Clinisys",
    apiType: "HL7 / REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "sectra",
    name: "Sectra",
    category: "Acute & Secondary",
    description: "Medical imaging IT — PACS, RIS, and digital pathology for NHS trusts.",
    color: "#7F1D1D",
    initials: "SEC",
    vendor: "Sectra",
    apiType: "DICOM / FHIR",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── REFERRALS & PATHWAYS ──────────────────────────────────────────────────────

  {
    id: "ers",
    name: "NHS e-Referral Service",
    category: "Referrals & Pathways",
    description: "RTT referrals, waiting list imports, and NHS appointment booking.",
    color: "#005EB8",
    initials: "eRS",
    vendor: "NHS England",
    apiType: "NHS API / FHIR",
    environment: "production",
    lastSync: "15 min ago",
    linkedPlatformModules: ["Operations", "Planning", "Intelligence"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "referral_intake",   label: "Referral Intake",          surface: ["operations"],              description: "RTT referrals and waiting list entries from primary care" },
      { id: "waiting_list",      label: "Waiting List Management",  surface: ["logistics"],               description: "Waiting list imports, RTT pathways, and slot management" },
      { id: "appointment_slots", label: "Appointment Slots",        surface: ["logistics"],               description: "NHS appointment booking and slot availability management" },
      { id: "rtt_intelligence",  label: "RTT Analytics",            surface: ["intelligence"],            description: "Referral-to-treatment compliance, breach risk, and pathway analytics" },
    ],
  },
  {
    id: "ptl",
    name: "PTL Systems",
    category: "Referrals & Pathways",
    description: "Patient Tracking List management for RTT compliance monitoring.",
    color: "#0EA5E9",
    initials: "PTL",
    vendor: "Various NHS Trusts",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "opbooking",
    name: "Outpatient Booking",
    category: "Referrals & Pathways",
    description: "Outpatient appointment scheduling and slot management.",
    color: "#6366F1",
    initials: "OPB",
    vendor: "Various",
    apiType: "REST / FHIR",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "somerset-cancer",
    name: "Somerset Cancer Registry",
    category: "Referrals & Pathways",
    description: "Cancer pathway tracking and staging data for oncology services.",
    color: "#881337",
    initials: "SCR",
    vendor: "Somerset NHS",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "bluespier",
    name: "Bluespier",
    category: "Referrals & Pathways",
    description: "Theatre scheduling and elective care pathway management.",
    color: "#1E3A8A",
    initials: "BLS",
    vendor: "Bluespier",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "infoflex",
    name: "InfoFlex",
    category: "Referrals & Pathways",
    description: "Cancer pathway and multi-disciplinary team (MDT) data management.",
    color: "#6D28D9",
    initials: "IFX",
    vendor: "Chameleon Information Management",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── URGENT & EMERGENCY ────────────────────────────────────────────────────────

  {
    id: "nhs111",
    name: "NHS 111",
    category: "Urgent & Emergency",
    description: "Urgent care triage and referral pathways from NHS 111 service.",
    color: "#005EB8",
    initials: "111",
    vendor: "NHS England",
    apiType: "REST / ITK",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "cas",
    name: "CAS",
    category: "Urgent & Emergency",
    description: "Clinical Assessment Service — GP-led urgent care consultation.",
    color: "#DC2626",
    initials: "CAS",
    vendor: "Various",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "ambulance-cad",
    name: "Ambulance CAD",
    category: "Urgent & Emergency",
    description: "Computer Aided Dispatch for ambulance services and emergency response.",
    color: "#166534",
    initials: "CAD",
    vendor: "Various (Cleric, Systopia)",
    apiType: "REST / HL7",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "ed-tracking",
    name: "ED Tracking Board",
    category: "Urgent & Emergency",
    description: "Emergency department patient flow and 4-hour target monitoring.",
    color: "#9F1239",
    initials: "EDT",
    vendor: "Various",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "adastra",
    name: "Adastra",
    category: "Urgent & Emergency",
    description: "Out-of-hours clinical system for urgent and unscheduled care.",
    color: "#1D4ED8",
    initials: "ADA",
    vendor: "Advanced",
    apiType: "REST / HL7",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── MENTAL HEALTH ─────────────────────────────────────────────────────────────

  {
    id: "rio",
    name: "Rio",
    category: "Mental Health",
    description: "Mental health and community EPR — assessments, care plans, and outcomes.",
    color: "#7C3AED",
    initials: "RIO",
    vendor: "Servelec / Civica",
    apiType: "REST",
    environment: "sandbox",
    linkedPlatformModules: ["Operations", "Intelligence"],
    modules: [
      nc("rio-assessments", "Assessments", "Mental health assessments, triage, and clinical scoring", [
        { domain: "Assessment data",   direction: "inbound" },
        { domain: "Clinical scoring",  direction: "inbound" },
      ], ["/rio/assessments", "/rio/clinical/scores"]),
      nc("rio-careplans", "Care Plans", "Care plan creation, review, and multidisciplinary team coordination", [
        { domain: "Care plans",    direction: "bidirectional" },
        { domain: "MDT outcomes",  direction: "inbound" },
      ], ["/rio/careplans", "/rio/mdt"]),
      nc("rio-risk", "Risk Profiles", "Risk assessments, safeguarding flags, and alerts", [
        { domain: "Risk assessments",    direction: "inbound" },
        { domain: "Safeguarding alerts", direction: "outbound" },
      ], ["/rio/risk", "/rio/safeguarding"]),
      nc("rio-caseload", "Caseload", "Caseload management, referrals, and discharge tracking", [
        { domain: "Caseload data",   direction: "inbound" },
        { domain: "Referral status", direction: "inbound" },
      ], ["/rio/caseload", "/rio/referrals"]),
    ],
    capabilities: [
      { id: "mh_assessments", label: "MH Assessments",   surface: ["operations"],               description: "Clinical assessments and scoring tools",       module: "rio-assessments" },
      { id: "mh_care_plans",  label: "Care Plans",        surface: ["operations"],               description: "MDT care plan coordination",                   module: "rio-careplans"   },
      { id: "risk_profiles",  label: "Risk Profiles",     surface: ["operations", "configurator"], description: "Risk assessments and safeguarding alert triggers", module: "rio-risk"     },
      { id: "mh_caseload",    label: "Caseload",          surface: ["logistics"],                description: "Caseload allocation and referral tracking",     module: "rio-caseload"   },
    ],
  },

  {
    id: "paris",
    name: "PARIS",
    category: "Mental Health",
    description: "Community mental health patient administration and records system.",
    color: "#5B21B6",
    initials: "PRS",
    vendor: "Healthcare Gateway",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "carenotes",
    name: "CarEnotes",
    category: "Mental Health",
    description: "Clinical documentation and care coordination for mental health services.",
    color: "#6D28D9",
    initials: "CNT",
    vendor: "CarEnotes",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "iaptus",
    name: "IAPTus",
    category: "Mental Health",
    description: "IAPT service system — patient outcomes, therapist sessions, SNOMED coding.",
    color: "#4C1D95",
    initials: "IAP",
    vendor: "Mayden",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "pcmis",
    name: "PCMIS",
    category: "Mental Health",
    description: "Primary care mental health and IAPT management information system.",
    color: "#3730A3",
    initials: "PCM",
    vendor: "University of York",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── PHARMACY ──────────────────────────────────────────────────────────────────

  {
    id: "eps",
    name: "EPS",
    category: "Pharmacy",
    description: "Electronic Prescription Service — NHS prescriptions transmitted digitally.",
    color: "#047857",
    initials: "EPS",
    vendor: "NHS England",
    apiType: "NHS Spine API",
    environment: "production",
    lastSync: "8 min ago",
    linkedPlatformModules: ["Operations", "Intelligence"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "prescriptions",      label: "Electronic Prescriptions", surface: ["logistics"],                   description: "NHS prescriptions transmitted via Spine to community dispensers" },
      { id: "dispense_events",    label: "Dispense Events",          surface: ["logistics", "intelligence"],   description: "Dispense confirmation and medication adherence data" },
      { id: "medication_history", label: "Medication History",       surface: ["operations"],                  description: "Patient medication history for clinical safety and prescribing checks" },
    ],
  },
  {
    id: "pharmoutcomes",
    name: "PharmOutcomes",
    category: "Pharmacy",
    description: "Community pharmacy service recording and outcomes reporting.",
    color: "#065F46",
    initials: "PHO",
    vendor: "Outcomes4Health",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "sonar",
    name: "Sonar",
    category: "Pharmacy",
    description: "Pharmacy management — stock control, dispensing workflow, clinical checks.",
    color: "#0F766E",
    initials: "SNR",
    vendor: "Sonar Informatics",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "scriptswitch",
    name: "ScriptSwitch",
    category: "Pharmacy",
    description: "Prescribing optimisation tool — cost reduction and formulary compliance.",
    color: "#134E4A",
    initials: "SSW",
    vendor: "Optum",
    apiType: "EMIS / TPP plugin",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── WORKFORCE ─────────────────────────────────────────────────────────────────

  {
    id: "healthroster",
    name: "Allocate HealthRoster",
    category: "Workforce",
    description: "NHS staff rostering, e-roster compliance, and bank staff management.",
    color: "#1E40AF",
    initials: "ALO",
    vendor: "Allocate Software",
    apiType: "Allocate API",
    environment: "sandbox",
    linkedPlatformModules: ["Planning", "Operations"],
    modules: [
      nc("hr-roster", "Roster Management", "Shift patterns, rota publishing, and e-roster compliance", [
        { domain: "Shift patterns",      direction: "inbound" },
        { domain: "Compliance data",     direction: "inbound" },
        { domain: "Leave requests",      direction: "bidirectional" },
      ], ["/allocate/roster", "/allocate/shifts", "/allocate/compliance"]),
      nc("hr-bank", "Bank Shifts", "NHS bank staff pool, shift offers, and fill rate tracking", [
        { domain: "Bank shifts",  direction: "inbound" },
        { domain: "Fill rates",   direction: "inbound" },
      ], ["/allocate/bank/shifts", "/allocate/bank/workers"]),
      nc("hr-compliance", "Compliance", "Working time regulations, mandatory training, and safe staffing", [
        { domain: "Compliance reports", direction: "inbound" },
        { domain: "Breach alerts",      direction: "outbound" },
      ], ["/allocate/compliance/report", "/allocate/wtr"]),
    ],
    capabilities: [
      { id: "roster_management", label: "Roster Management",     surface: ["logistics"],               description: "Shift patterns, rota publishing, and e-roster compliance",  module: "hr-roster"      },
      { id: "bank_shifts",       label: "Bank Shift Management",  surface: ["logistics"],               description: "NHS bank staff pool and shift fulfilment tracking",          module: "hr-bank"        },
      { id: "wtr_compliance",    label: "WTR Compliance",         surface: ["logistics", "intelligence"], description: "Working time breaches, safe staffing, and mandatory training", module: "hr-compliance" },
    ],
  },

  {
    id: "esr",
    name: "NHS ESR",
    category: "Workforce",
    description: "Employee Staff Records — contracts, pay bands, mandatory training status.",
    color: "#005EB8",
    initials: "ESR",
    vendor: "NHS England / Oracle",
    apiType: "ESR API",
    environment: "sandbox",
    linkedPlatformModules: ["Planning", "Intelligence"],
    modules: [
      nc("esr-employees", "Employee Records", "Staff contracts, pay bands, employment history, and personal details", [
        { domain: "Employee records", direction: "inbound" },
        { domain: "Pay band data",    direction: "inbound" },
      ], ["/esr/employees", "/esr/contracts"]),
      nc("esr-training", "Training", "Mandatory training compliance, e-learning records, and expiry tracking", [
        { domain: "Training compliance", direction: "inbound" },
        { domain: "e-Learning records",  direction: "inbound" },
      ], ["/esr/training", "/esr/learning"]),
      nc("esr-absence", "Absence Management", "Sickness absence, Bradford Factor, and occupational health referrals", [
        { domain: "Absence data",   direction: "inbound" },
        { domain: "Bradford score", direction: "inbound" },
      ], ["/esr/absence", "/esr/occupational-health"]),
    ],
    capabilities: [
      { id: "employee_records",   label: "Employee Records",    surface: ["logistics"],               description: "Staff contracts, pay bands, and employment history",          module: "esr-employees" },
      { id: "training_compliance", label: "Training Compliance", surface: ["logistics", "intelligence"], description: "Mandatory training status and compliance reporting",           module: "esr-training"  },
      { id: "absence_data",       label: "Absence Management",  surface: ["logistics", "intelligence"], description: "Sickness absence, Bradford Factor, and OH referral tracking", module: "esr-absence"   },
    ],
  },

  {
    id: "trac",
    name: "Trac",
    category: "Workforce",
    description: "NHS recruitment platform — job applications, interview scheduling, and onboarding.",
    color: "#0EA5E9",
    initials: "TRC",
    vendor: "Trac Systems",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "nhsjobs",
    name: "NHS Jobs",
    category: "Workforce",
    description: "National NHS job advertising and applicant management portal.",
    color: "#003087",
    initials: "NJB",
    vendor: "NHS England",
    apiType: "NHS Jobs API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "bankstaff",
    name: "BankStaff Systems",
    category: "Workforce",
    description: "NHS bank and agency staffing pool management and shift fulfilment.",
    color: "#0F766E",
    initials: "BNK",
    vendor: "Various (Patchwork, Locums Nest)",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── PATIENT APPS ──────────────────────────────────────────────────────────────

  {
    id: "nhs-app",
    name: "NHS App",
    category: "Patient Apps",
    description: "National patient portal — records access, appointments, prescriptions.",
    color: "#005EB8",
    initials: "NHS",
    vendor: "NHS England",
    apiType: "NHS API / FHIR",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "patient-access",
    name: "Patient Access",
    category: "Patient Apps",
    description: "GP online services — appointment booking, repeat prescriptions, record access.",
    color: "#0284C7",
    initials: "PA",
    vendor: "EMIS Health",
    apiType: "EMIS API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "mygp",
    name: "MyGP",
    category: "Patient Apps",
    description: "GP-connected patient app — appointments, test results, and messaging.",
    color: "#059669",
    initials: "MGP",
    vendor: "iGPR",
    apiType: "TPP / EMIS API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "evergreen-life",
    name: "Evergreen Life",
    category: "Patient Apps",
    description: "Personal health records — patients aggregate and manage their health data.",
    color: "#16A34A",
    initials: "EVG",
    vendor: "Evergreen Life",
    apiType: "FHIR",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "drdoctor",
    name: "DrDoctor",
    category: "Patient Apps",
    description: "Outpatient engagement — digital letters, self-scheduling, and patient portal.",
    color: "#4F46E5",
    initials: "DRD",
    vendor: "DrDoctor",
    apiType: "REST / FHIR",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "induction",
    name: "Induction / Zesty",
    category: "Patient Apps",
    description: "Digital front door — outpatient check-in, virtual waiting room, and forms.",
    color: "#7C3AED",
    initials: "IND",
    vendor: "Induction Healthcare",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "pkb",
    name: "Patients Know Best",
    category: "Patient Apps",
    description: "Shared care records and patient-controlled health information platform.",
    color: "#1D4ED8",
    initials: "PKB",
    vendor: "Patients Know Best",
    apiType: "FHIR R4",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  // ── REPORTING & INCIDENT ──────────────────────────────────────────────────────

  {
    id: "sus",
    name: "SUS",
    category: "Reporting & Incident",
    description: "Secondary Uses Service — NHS secondary care activity and commissioning data.",
    color: "#005EB8",
    initials: "SUS",
    vendor: "NHS England",
    apiType: "NHS DARS / FHIR",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "slam",
    name: "SLAM",
    category: "Reporting & Incident",
    description: "Mental Health Services Dataset and community activity reporting.",
    color: "#0891B2",
    initials: "SLM",
    vendor: "NHS England",
    apiType: "NHS API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "model-health",
    name: "Model Health System",
    category: "Reporting & Incident",
    description: "NHS benchmarking and analytics — compare performance across trusts.",
    color: "#0369A1",
    initials: "MHS",
    vendor: "NHS England",
    apiType: "Web / REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "powerbi",
    name: "Power BI",
    category: "Reporting & Incident",
    description: "Microsoft analytics platform — NHS trust dashboards and operational reports.",
    color: "#F59E0B",
    initials: "PBI",
    vendor: "Microsoft",
    apiType: "Power BI REST API",
    environment: "production",
    lastSync: "30 min ago",
    linkedPlatformModules: ["Intelligence"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "bi_dashboards",  label: "BI Dashboards",    surface: ["intelligence"],            description: "Trust-wide analytics dashboards and operational performance reports" },
      { id: "kpi_feeds",      label: "KPI Feeds",        surface: ["intelligence"],            description: "Live KPI data feeds embedded into Intelligence surfaces" },
      { id: "report_outputs", label: "Report Outputs",   surface: ["intelligence", "apps"],    description: "Exportable reports, scheduled distribution, and embedded visuals" },
    ],
  },
  {
    id: "ulysses",
    name: "Ulysses",
    category: "Reporting & Incident",
    description: "Incident and risk management — patient safety events and near misses.",
    color: "#6D28D9",
    initials: "ULY",
    vendor: "Ulysses Systems",
    apiType: "REST",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },

  {
    id: "datix",
    name: "Datix",
    category: "Reporting & Incident",
    description: "Patient safety and risk management — incidents, complaints, and claims.",
    color: "#DC2626",
    initials: "DTX",
    vendor: "RLDatix",
    apiType: "Datix Web API",
    environment: "sandbox",
    linkedPlatformModules: ["Intelligence", "Operations"],
    modules: [
      nc("datix-incidents", "Incidents", "Patient safety incidents, near misses, and Never Events reporting", [
        { domain: "Incident records",  direction: "inbound" },
        { domain: "Safety alerts",     direction: "outbound" },
      ], ["/datix/incidents", "/datix/incidents/alerts"]),
      nc("datix-risk", "Risk Register", "Organisational risk register, risk scoring, and mitigations", [
        { domain: "Risk entries",    direction: "inbound" },
        { domain: "Risk scores",     direction: "inbound" },
      ], ["/datix/risk", "/datix/risk/scores"]),
      nc("datix-complaints", "Complaints", "Patient complaints, PALS contacts, and resolution tracking", [
        { domain: "Complaint records", direction: "inbound" },
        { domain: "PALS data",         direction: "inbound" },
      ], ["/datix/complaints", "/datix/pals"]),
    ],
    capabilities: [
      { id: "incident_reporting", label: "Incident Reporting", surface: ["operations", "collaboration"], description: "Patient safety incidents, Never Events, and near misses",       module: "datix-incidents" },
      { id: "risk_register",      label: "Risk Register",      surface: ["intelligence", "configurator"], description: "Organisational risk scoring and rule-based escalation triggers", module: "datix-risk"      },
      { id: "complaints",         label: "Complaints",         surface: ["intelligence"],                  description: "Patient complaints and PALS resolution analytics",             module: "datix-complaints" },
    ],
  },

  // ── IDENTITY & ACCESS ─────────────────────────────────────────────────────────

  {
    id: "nhs-login",
    name: "NHS Login",
    category: "Identity & Access",
    description: "Citizen-facing NHS digital identity — verified access to NHS services.",
    color: "#005EB8",
    initials: "NL",
    vendor: "NHS England",
    apiType: "OpenID Connect",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "cis",
    name: "Care Identity Service",
    category: "Identity & Access",
    description: "NHS smartcard-based staff identity for secure system access.",
    color: "#003087",
    initials: "CIS",
    vendor: "NHS England",
    apiType: "CIS API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "cis2",
    name: "CIS2",
    category: "Identity & Access",
    description: "Next-generation NHS staff identity — modern MFA and cloud-native auth.",
    color: "#1E3A5F",
    initials: "CI2",
    vendor: "NHS England",
    apiType: "OpenID Connect / FHIR",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "smartcards",
    name: "Smartcards",
    category: "Identity & Access",
    description: "NHS smartcard infrastructure — card management and role-based access.",
    color: "#374151",
    initials: "SCA",
    vendor: "NHS England",
    apiType: "CIS API",
    environment: "sandbox",
    modules: [],
    flatStatus: "not_connected",
  },
  {
    id: "azure-ad",
    name: "Azure Active Directory",
    category: "Identity & Access",
    description: "NHS SSO, staff role synchronisation, and MFA via Microsoft MSAL.",
    color: "#0078D4",
    initials: "AAD",
    vendor: "Microsoft",
    apiType: "MSAL / OAuth 2.0",
    environment: "production",
    lastSync: "Active",
    linkedPlatformModules: ["Settings", "Operations"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "identity_auth", label: "Identity & Authentication", surface: ["settings"],                  description: "SSO and MFA for NHS staff via MSAL / OAuth 2.0" },
      { id: "role_sync",     label: "Role Synchronisation",      surface: ["settings", "configurator"], description: "Sync staff roles and group memberships into TOM access control" },
      { id: "sso_tokens",    label: "Single Sign-On",            surface: ["settings"],                 description: "Unified session tokens across all TOM surfaces" },
    ],
  },

  // ── INTEROPERABILITY ──────────────────────────────────────────────────────────

  {
    id: "nhs-spine",
    name: "NHS Spine",
    category: "Interoperability",
    description: "National NHS infrastructure — PDS, ODS, NHS number verification, and Summary Care Record.",
    color: "#005EB8",
    initials: "SPN",
    vendor: "NHS England",
    apiType: "SMSP / FHIR",
    environment: "production",
    lastSync: "2 min ago",
    linkedPlatformModules: ["Operations", "Planning", "Intelligence"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "patient_demographics", label: "Patient Demographics (PDS)", surface: ["operations", "logistics"],    description: "NHS number verification and demographic lookup via the Personal Demographics Service" },
      { id: "org_data",             label: "Organisation Data (ODS)",    surface: ["settings", "configurator"],   description: "ODS code lookup for trust and site configuration" },
      { id: "summary_care_record",  label: "Summary Care Record",        surface: ["operations"],                 description: "Patient SCR access for point-of-care clinical safety checks" },
    ],
  },
  {
    id: "nhs-mail",
    name: "NHS Mail",
    category: "Interoperability",
    description: "Secure NHS email — staff notifications, referral letters, and audit trails.",
    color: "#003087",
    initials: "MAIL",
    vendor: "NHS England / Accenture",
    apiType: "Microsoft Graph API",
    environment: "production",
    lastSync: "Just now",
    linkedPlatformModules: ["Collaboration", "Operations"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "email_notifications", label: "Email Notifications", surface: ["collaboration", "operations"], description: "Secure NHS email for staff alerts, referral letters, and escalations" },
      { id: "document_delivery",   label: "Document Delivery",   surface: ["collaboration"],               description: "Deliver clinical documents via NHS-secure email" },
      { id: "email_automation",    label: "Automated Triggers",  surface: ["configurator"],               description: "Rule-based email dispatch on clinical events" },
    ],
  },
  {
    id: "fhir-r4",
    name: "FHIR R4",
    category: "Interoperability",
    description: "HL7 FHIR R4 API gateway — standards-based data exchange across NHS systems.",
    color: "#0284C7",
    initials: "FHIR",
    vendor: "HL7 International",
    apiType: "FHIR R4",
    environment: "production",
    lastSync: "5 min ago",
    linkedPlatformModules: ["Operations", "Planning", "Intelligence"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "fhir_data_exchange", label: "FHIR Data Exchange",  surface: ["operations", "logistics", "intelligence"], description: "Standards-based resource exchange (Patient, Observation, Encounter, Procedure, Condition)" },
      { id: "fhir_subscriptions", label: "Event Subscriptions", surface: ["configurator"],                             description: "FHIR subscription events for real-time workflow triggers in the Configurator" },
    ],
  },
  {
    id: "hl7-v2",
    name: "HL7 v2",
    category: "Interoperability",
    description: "Legacy HL7 v2 message broker — ADT, ORM, ORU, and SIU message feeds.",
    color: "#4B5563",
    initials: "HL7",
    vendor: "HL7 International",
    apiType: "HL7 v2.x",
    environment: "production",
    lastSync: "1 min ago",
    linkedPlatformModules: ["Operations"],
    modules: [],
    flatStatus: "production",
    capabilities: [
      { id: "adt_events",      label: "ADT Event Stream",   surface: ["operations", "configurator"], description: "Admit, discharge, and transfer events — backbone of patient flow awareness" },
      { id: "order_messages",  label: "Order Messages",     surface: ["logistics"],                  description: "ORM order messages from requesting systems (lab, radiology, pharmacy)" },
      { id: "result_messages", label: "Result Messages",    surface: ["operations"],                 description: "ORU result messages from lab and radiology for clinical review" },
    ],
  },
];
