export type ThreadType = "operational" | "logistics" | "incident" | "project";
export type ThreadStatus = "open" | "in_progress" | "blocked" | "at_risk" | "escalated" | "resolved";
export type ThreadPriority = "green" | "amber" | "red";
export type SourceSystem = "TOM" | "USER" | "TEAMS" | "NHSMAIL" | "SYSTEM";

export type ThreadPolicy = {
  allowPII: boolean;
  allowAttachments: boolean;
  retentionClass: "low" | "standard" | "high";
};

export type LinkedEntities = {
  patientId?: string;
  pathwayId?: string;
  sessionId?: string;
  resourceId?: string;
};

export type Thread = {
  id: string;
  title: string;
  type: ThreadType;
  status: ThreadStatus;
  priority: ThreadPriority;
  source?: "thread" | "forum" | "huddle" | "tom" | "external" | "unknown";
  topic?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  viewCount?: number;
  watchersCount?: number;
  likesCount?: number;
  acknowledgesCount?: number;
  ownerId: string;
  participantIds: string[];
  watcherIds: string[];
  linkedEntities: LinkedEntities;
  policy: ThreadPolicy;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  lastMessage?: string;
  provenance?: string[];
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sourceSystem: SourceSystem;
  sourceId?: string;
  replyToId?: string;
  flagged?: boolean;
};

export type AuditEvent = {
  id: string;
  threadId: string;
  eventType: string;
  actorId: string;
  sourceSystem: SourceSystem;
  observedAt: string;
  recordedAt: string;
  payload: Record<string, unknown>;
};

export type Escalation = {
  threadId: string;
  level: "L1" | "L2" | "L3" | "L4";
  reason: string;
  raisedBy: string;
  raisedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
};

export type HandoverItem = {
  id: string;
  threadId?: string;
  note: string;
  shiftDate: string;
  createdBy: string;
  createdAt: string;
};

export type IntegrationAdapter = {
  id: "teams" | "nhsmail" | "sharepoint";
  label: string;
  status: "connected" | "not_connected";
  fetchEvents: () => Message[];
};

export const INTEGRATION_ADAPTERS: IntegrationAdapter[] = [
  { id: "teams", label: "Microsoft Teams", status: "not_connected", fetchEvents: () => [] },
  { id: "nhsmail", label: "NHSmail / Outlook", status: "not_connected", fetchEvents: () => [] },
  { id: "sharepoint", label: "SharePoint", status: "not_connected", fetchEvents: () => [] },
];

export const integrationStatus = {
  Teams: { connected: false },
  NHSmail: { connected: false },
  SharePoint: { connected: false },
} as const;

export const threadParticipants: Record<string, { name: string; role: string }> = {
  "user-001": { name: "A. Patel", role: "Ops" },
  "user-002": { name: "R. Singh", role: "Logistics" },
  spatel: { name: "S. Patel", role: "Service Delivery" },
  jrivers: { name: "J. Rivers", role: "Site" },
  tokafor: { name: "T. Okafor", role: "Workforce" },
  tom: { name: "TOM", role: "Orchestrator" },
  system: { name: "System", role: "Connector" },
};

export const collaborationThreads: Thread[] = [
  {
    id: "thr-001",
    title: "RTT breach risk - Ortho list 12B",
    type: "operational",
    status: "at_risk",
    priority: "amber",
    source: "tom",
    topic: "Access",
    isPinned: false,
    isLocked: false,
    viewCount: 42,
    watchersCount: 3,
    likesCount: 1,
    acknowledgesCount: 2,
    ownerId: "spatel",
    participantIds: ["user-001", "spatel", "tokafor", "tom"],
    watcherIds: ["tokafor"],
    linkedEntities: { pathwayId: "RTT-18w", sessionId: "Ortho-12B" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
    createdAt: "2026-02-20T07:18:00Z",
    updatedAt: "2026-02-20T09:02:00Z",
    unreadCount: 2,
    lastMessage: "Awaiting slot confirmation.",
    provenance: ["PAS", "PTL", "e-RS"],
  },
  {
    id: "thr-002",
    title: "Ward 4B - capacity alert (beds < 5)",
    type: "operational",
    status: "escalated",
    priority: "red",
    source: "tom",
    topic: "Capacity",
    isPinned: true,
    isLocked: false,
    viewCount: 88,
    watchersCount: 5,
    likesCount: 2,
    acknowledgesCount: 4,
    ownerId: "jrivers",
    participantIds: ["user-001", "jrivers", "tom"],
    watcherIds: [],
    linkedEntities: { resourceId: "Ward 4B" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "high" },
    createdAt: "2026-02-20T06:40:00Z",
    updatedAt: "2026-02-20T09:10:00Z",
    unreadCount: 0,
    lastMessage: "Escalation raised to L2.",
    provenance: ["PAS", "ED Board"],
  },
  {
    id: "thr-003",
    title: "Staffing gap - Anaesthetics PM cover",
    type: "logistics",
    status: "in_progress",
    priority: "amber",
    source: "thread",
    topic: "Workforce",
    isPinned: false,
    isLocked: false,
    viewCount: 31,
    watchersCount: 2,
    likesCount: 0,
    acknowledgesCount: 1,
    ownerId: "tokafor",
    participantIds: ["user-001", "tokafor", "tom"],
    watcherIds: [],
    linkedEntities: { sessionId: "Anaesthetics PM" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "standard" },
    createdAt: "2026-02-19T17:20:00Z",
    updatedAt: "2026-02-20T08:35:00Z",
    unreadCount: 1,
    lastMessage: "Bank request sent to staffing pool.",
    provenance: ["HealthRoster", "ESR"],
  },
  {
    id: "thr-004",
    title: "Equipment shortage - C-Arm not available",
    type: "logistics",
    status: "open",
    priority: "green",
    source: "forum",
    topic: "Equipment",
    isPinned: false,
    isLocked: false,
    viewCount: 12,
    watchersCount: 1,
    likesCount: 0,
    acknowledgesCount: 0,
    ownerId: "user-002",
    participantIds: ["user-001", "user-002", "tom"],
    watcherIds: [],
    linkedEntities: { resourceId: "C-Arm" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "low" },
    createdAt: "2026-02-20T08:02:00Z",
    updatedAt: "2026-02-20T08:02:00Z",
    unreadCount: 0,
    lastMessage: "Awaiting asset update.",
    provenance: ["Asset Register"],
  },
  {
    id: "thr-005",
    title: "Radiology turnaround delays - CT reporting backlog",
    type: "operational",
    status: "in_progress",
    priority: "amber",
    source: "tom",
    topic: "Diagnostics",
    isPinned: false,
    isLocked: false,
    viewCount: 27,
    watchersCount: 2,
    likesCount: 1,
    acknowledgesCount: 1,
    ownerId: "jrivers",
    participantIds: ["user-001", "jrivers"],
    watcherIds: [],
    linkedEntities: { sessionId: "CT-Reporting" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
    createdAt: "2026-02-20T07:45:00Z",
    updatedAt: "2026-02-20T09:20:00Z",
    unreadCount: 1,
    lastMessage: "Extra session added for reporting.",
    provenance: ["RIS"],
  },
  {
    id: "thr-006",
    title: "ED flow - corridor wait over 6h",
    type: "incident",
    status: "escalated",
    priority: "red",
    source: "tom",
    topic: "ED Flow",
    isPinned: true,
    isLocked: false,
    viewCount: 63,
    watchersCount: 6,
    likesCount: 3,
    acknowledgesCount: 5,
    ownerId: "spatel",
    participantIds: ["user-001", "spatel", "tom"],
    watcherIds: ["user-001"],
    linkedEntities: { sessionId: "ED-Flow" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "high" },
    createdAt: "2026-02-20T05:30:00Z",
    updatedAt: "2026-02-20T09:25:00Z",
    unreadCount: 0,
    lastMessage: "Escalation raised to ops.",
    provenance: ["ED Board"],
  },
  {
    id: "thr-007",
    title: "Clinic overbooked - Cardiology follow-ups",
    type: "operational",
    status: "at_risk",
    priority: "amber",
    source: "thread",
    topic: "Outpatients",
    isPinned: false,
    isLocked: false,
    viewCount: 18,
    watchersCount: 2,
    likesCount: 0,
    acknowledgesCount: 1,
    ownerId: "tokafor",
    participantIds: ["user-001", "tokafor"],
    watcherIds: [],
    linkedEntities: { sessionId: "CARD-FU" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "standard" },
    createdAt: "2026-02-19T16:10:00Z",
    updatedAt: "2026-02-20T08:55:00Z",
    unreadCount: 2,
    lastMessage: "Reviewing additional slots.",
    provenance: ["PAS"],
  },
  {
    id: "thr-008",
    title: "Theatre list change request - Ortho 3",
    type: "project",
    status: "open",
    priority: "green",
    source: "forum",
    topic: "Theatres",
    isPinned: false,
    isLocked: false,
    viewCount: 9,
    watchersCount: 1,
    likesCount: 0,
    acknowledgesCount: 0,
    ownerId: "user-001",
    participantIds: ["user-001", "tom"],
    watcherIds: [],
    linkedEntities: { sessionId: "Ortho-3" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "low" },
    createdAt: "2026-02-20T08:35:00Z",
    updatedAt: "2026-02-20T08:35:00Z",
    unreadCount: 0,
    lastMessage: "Awaiting confirmation from theatres.",
    provenance: [],
  },
  {
    id: "thr-009",
    title: "Pharmacy stock low - IV antibiotics",
    type: "logistics",
    status: "blocked",
    priority: "amber",
    source: "external",
    topic: "Pharmacy",
    isPinned: false,
    isLocked: false,
    viewCount: 22,
    watchersCount: 2,
    likesCount: 1,
    acknowledgesCount: 1,
    ownerId: "user-002",
    participantIds: ["user-001", "user-002"],
    watcherIds: [],
    linkedEntities: { resourceId: "Pharmacy" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
    createdAt: "2026-02-19T19:05:00Z",
    updatedAt: "2026-02-20T09:05:00Z",
    unreadCount: 1,
    lastMessage: "Supplier ETA pending.",
    provenance: ["eProcurement"],
  },
  {
    id: "thr-010",
    title: "MRI coil maintenance overdue",
    type: "logistics",
    status: "in_progress",
    priority: "amber",
    source: "external",
    topic: "Equipment",
    isPinned: false,
    isLocked: false,
    viewCount: 14,
    watchersCount: 1,
    likesCount: 0,
    acknowledgesCount: 0,
    ownerId: "jrivers",
    participantIds: ["user-001", "jrivers"],
    watcherIds: [],
    linkedEntities: { resourceId: "MRI-2" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
    createdAt: "2026-02-19T14:20:00Z",
    updatedAt: "2026-02-20T07:50:00Z",
    unreadCount: 0,
    lastMessage: "Maintenance scheduled.",
    provenance: ["Asset Register"],
  },
  {
    id: "thr-011",
    title: "Surgery consent forms missing - day case",
    type: "incident",
    status: "blocked",
    priority: "amber",
    source: "thread",
    topic: "Surgery",
    isPinned: false,
    isLocked: false,
    viewCount: 11,
    watchersCount: 1,
    likesCount: 0,
    acknowledgesCount: 1,
    ownerId: "spatel",
    participantIds: ["user-001", "spatel"],
    watcherIds: [],
    linkedEntities: { sessionId: "DayCase-Consent" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "high" },
    createdAt: "2026-02-20T07:10:00Z",
    updatedAt: "2026-02-20T08:40:00Z",
    unreadCount: 1,
    lastMessage: "Chasing ward for paperwork.",
    provenance: [],
  },
  {
    id: "thr-012",
    title: "Neonatal transport delay - ambulance availability",
    type: "incident",
    status: "escalated",
    priority: "red",
    source: "tom",
    topic: "Transport",
    isPinned: true,
    isLocked: false,
    viewCount: 70,
    watchersCount: 7,
    likesCount: 2,
    acknowledgesCount: 6,
    ownerId: "jrivers",
    participantIds: ["user-001", "jrivers", "tom"],
    watcherIds: ["user-001", "tokafor"],
    linkedEntities: { resourceId: "Ambulance" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "high" },
    createdAt: "2026-02-20T04:55:00Z",
    updatedAt: "2026-02-20T09:00:00Z",
    unreadCount: 0,
    lastMessage: "Escalation notified to regional coordinator.",
    provenance: ["Ambulance Control"],
  },
  {
    id: "thr-013",
    title: "Community bed search - discharge to step-down",
    type: "operational",
    status: "open",
    priority: "green",
    source: "huddle",
    topic: "Discharge",
    isPinned: false,
    isLocked: false,
    viewCount: 8,
    watchersCount: 1,
    likesCount: 0,
    acknowledgesCount: 0,
    ownerId: "user-001",
    participantIds: ["user-001", "tokafor"],
    watcherIds: [],
    linkedEntities: { pathwayId: "Discharge-Search" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "standard" },
    createdAt: "2026-02-20T09:05:00Z",
    updatedAt: "2026-02-20T09:05:00Z",
    unreadCount: 0,
    lastMessage: "Awaiting placement options.",
    provenance: [],
  },
  {
    id: "thr-014",
    title: "Infection control notice - Ward 7A",
    type: "incident",
    status: "resolved",
    priority: "green",
    source: "forum",
    topic: "Infection Control",
    isPinned: false,
    isLocked: true,
    viewCount: 33,
    watchersCount: 2,
    likesCount: 1,
    acknowledgesCount: 2,
    ownerId: "spatel",
    participantIds: ["user-001", "spatel"],
    watcherIds: [],
    linkedEntities: { resourceId: "Ward 7A" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "high" },
    createdAt: "2026-02-18T11:15:00Z",
    updatedAt: "2026-02-19T15:45:00Z",
    unreadCount: 0,
    lastMessage: "All-clear issued by IPC.",
    provenance: ["IPC"],
  },
  {
    id: "thr-015",
    title: "Roster gap - Weekend physiotherapy cover",
    type: "logistics",
    status: "at_risk",
    priority: "amber",
    source: "thread",
    topic: "Workforce",
    isPinned: false,
    isLocked: false,
    viewCount: 19,
    watchersCount: 2,
    likesCount: 0,
    acknowledgesCount: 1,
    ownerId: "tokafor",
    participantIds: ["user-001", "tokafor"],
    watcherIds: [],
    linkedEntities: { sessionId: "Physio-Weekend" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "standard" },
    createdAt: "2026-02-19T13:05:00Z",
    updatedAt: "2026-02-20T08:10:00Z",
    unreadCount: 1,
    lastMessage: "Agency request submitted.",
    provenance: ["HealthRoster"],
  },
  {
    id: "thr-016",
    title: "Pathology courier delay - urgent samples",
    type: "incident",
    status: "blocked",
    priority: "amber",
    source: "external",
    topic: "Pathology",
    isPinned: false,
    isLocked: false,
    viewCount: 16,
    watchersCount: 1,
    likesCount: 0,
    acknowledgesCount: 1,
    ownerId: "jrivers",
    participantIds: ["user-001", "jrivers"],
    watcherIds: [],
    linkedEntities: { resourceId: "Courier" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
    createdAt: "2026-02-20T06:55:00Z",
    updatedAt: "2026-02-20T09:12:00Z",
    unreadCount: 0,
    lastMessage: "Courier ETA updated.",
    provenance: ["LIMS"],
  },
  {
    id: "thr-017",
    title: "Weekend elective list - additional theatre time",
    type: "project",
    status: "open",
    priority: "green",
    source: "forum",
    topic: "Theatres",
    isPinned: false,
    isLocked: false,
    viewCount: 6,
    watchersCount: 0,
    likesCount: 0,
    acknowledgesCount: 0,
    ownerId: "user-001",
    participantIds: ["user-001"],
    watcherIds: [],
    linkedEntities: { sessionId: "Elective-Weekend" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "low" },
    createdAt: "2026-02-20T09:10:00Z",
    updatedAt: "2026-02-20T09:10:00Z",
    unreadCount: 0,
    lastMessage: "Awaiting confirmation.",
    provenance: [],
  },
  {
    id: "thr-018",
    title: "Oxygen supply audit - manifold check",
    type: "logistics",
    status: "in_progress",
    priority: "amber",
    source: "huddle",
    topic: "Facilities",
    isPinned: false,
    isLocked: false,
    viewCount: 10,
    watchersCount: 1,
    likesCount: 0,
    acknowledgesCount: 0,
    ownerId: "user-002",
    participantIds: ["user-001", "user-002"],
    watcherIds: [],
    linkedEntities: { resourceId: "Oxygen-Plant" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
    createdAt: "2026-02-20T08:15:00Z",
    updatedAt: "2026-02-20T08:45:00Z",
    unreadCount: 0,
    lastMessage: "Facilities review underway.",
    provenance: [],
  },
  {
    id: "thr-019",
    title: "Specialist nurse cover - oncology outpatient",
    type: "operational",
    status: "open",
    priority: "green",
    source: "thread",
    topic: "Workforce",
    isPinned: false,
    isLocked: false,
    viewCount: 7,
    watchersCount: 0,
    likesCount: 0,
    acknowledgesCount: 0,
    ownerId: "tokafor",
    participantIds: ["user-001", "tokafor"],
    watcherIds: [],
    linkedEntities: { sessionId: "Oncology-OPD" },
    policy: { allowPII: false, allowAttachments: true, retentionClass: "standard" },
    createdAt: "2026-02-20T08:50:00Z",
    updatedAt: "2026-02-20T08:50:00Z",
    unreadCount: 0,
    lastMessage: "Awaiting rota confirmation.",
    provenance: [],
  },
  {
    id: "thr-020",
    title: "Community referral backlog - MSK physio",
    type: "operational",
    status: "at_risk",
    priority: "amber",
    source: "external",
    topic: "Community",
    isPinned: false,
    isLocked: false,
    viewCount: 24,
    watchersCount: 2,
    likesCount: 1,
    acknowledgesCount: 1,
    ownerId: "spatel",
    participantIds: ["user-001", "spatel"],
    watcherIds: [],
    linkedEntities: { pathwayId: "MSK-Community" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
    createdAt: "2026-02-19T12:30:00Z",
    updatedAt: "2026-02-20T07:35:00Z",
    unreadCount: 1,
    lastMessage: "Escalated to community ops.",
    provenance: ["Community PAS"],
  },
  {
    id: "thr-021",
    title: "Blood fridge temperature excursion",
    type: "incident",
    status: "escalated",
    priority: "red",
    source: "tom",
    topic: "Pathology",
    isPinned: true,
    isLocked: false,
    viewCount: 55,
    watchersCount: 4,
    likesCount: 2,
    acknowledgesCount: 3,
    ownerId: "jrivers",
    participantIds: ["user-001", "jrivers", "tom"],
    watcherIds: [],
    linkedEntities: { resourceId: "Blood-Storage" },
    policy: { allowPII: false, allowAttachments: false, retentionClass: "high" },
    createdAt: "2026-02-20T06:20:00Z",
    updatedAt: "2026-02-20T09:18:00Z",
    unreadCount: 0,
    lastMessage: "IPC notified, audit underway.",
    provenance: ["LIMS"],
  },
];

export const seedMessages: Message[] = [
  {
    id: "msg-001",
    threadId: "thr-001",
    senderId: "system",
    body: "RTT clock breach risk detected for Ortho cohort (17.5w).",
    createdAt: "2026-02-20T07:18:00Z",
    sourceSystem: "SYSTEM",
    sourceId: "ptl-ops-7712",
  },
  {
    id: "msg-002",
    threadId: "thr-001",
    senderId: "spatel",
    body: "Escalated to scheduling. Awaiting slot confirmation.",
    createdAt: "2026-02-20T08:12:00Z",
    sourceSystem: "USER",
  },
  {
    id: "msg-003",
    threadId: "thr-002",
    senderId: "system",
    body: "Ward 4B available beds < 5 for >30 mins.",
    createdAt: "2026-02-20T06:40:00Z",
    sourceSystem: "SYSTEM",
    sourceId: "adt-bed-4421",
  },
  {
    id: "msg-004",
    threadId: "thr-003",
    senderId: "tokafor",
    body: "Bank request sent to staffing pool.",
    createdAt: "2026-02-20T08:00:00Z",
    sourceSystem: "SYSTEM",
    sourceId: "roster-anaes-013",
  },
];

export const seedAuditEvents: AuditEvent[] = [
  {
    id: "aud-001",
    threadId: "thr-001",
    eventType: "THREAD_CREATED",
    actorId: "system:ptl",
    sourceSystem: "SYSTEM",
    observedAt: "2026-02-20T07:18:00Z",
    recordedAt: "2026-02-20T07:19:12Z",
    payload: { message: "Thread created from PTL breach signal" },
  },
  {
    id: "aud-002",
    threadId: "thr-003",
    eventType: "OWNER_ASSIGNED",
    actorId: "user:spatel",
    sourceSystem: "USER",
    observedAt: "2026-02-19T17:20:00Z",
    recordedAt: "2026-02-19T17:20:44Z",
    payload: { owner: "R. Singh" },
  },
];

export const seedEscalations: Escalation[] = [
  {
    threadId: "thr-002",
    level: "L2",
    reason: "Capacity below safe threshold",
    raisedBy: "system:pas",
    raisedAt: "2026-02-20T06:45:00Z",
  },
];

export const seedHandoverItems: HandoverItem[] = [
  {
    id: "ho-001",
    threadId: "thr-001",
    note: "RTT breach risk - awaiting slot confirmation.",
    shiftDate: "2026-02-20",
    createdBy: "spatel",
    createdAt: "2026-02-20T07:30:00Z",
  },
];

const auditStore: AuditEvent[] = [...seedAuditEvents];
const idCounters: Record<string, number> = {
  audit: seedAuditEvents.length,
  msg: seedMessages.length,
  thread: collaborationThreads.length,
};

// Governance note (DTAC/DSPT/UK GDPR readiness)
// - Data minimisation: store metadata + identifiers; deep-link to source content where possible.
// - Purpose limitation: only display data relevant to operational threads.
// - Retention hooks: keep audit trails immutable; allow retention policies to purge content links.
// - Access controls: enforce role-based access in UI and connector boundaries.
// - Provenance required on every event (sourceSystem/sourceId/observedAt/recordedAt/actorId).

export function appendAuditEvent(event: AuditEvent): AuditEvent {
  auditStore.push(event);
  return event;
}

export function detectPII(text: string): boolean {
  if (!text) return false;
  const nhsNumber = /\b\d{3}\s?\d{3}\s?\d{4}\b/;
  const dob = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\b/;
  const nhsId = /\bNHS[-\s]?\d{6,10}\b/i;
  return nhsNumber.test(text) || dob.test(text) || nhsId.test(text);
}

export function nextId(prefix: string): string {
  const nextValue = (idCounters[prefix] || 0) + 1;
  idCounters[prefix] = nextValue;
  return `${prefix}-${String(nextValue).padStart(3, "0")}`;
}
