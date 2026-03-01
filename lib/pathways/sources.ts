export type SourceSystem = {
  system: string;
  status: "connected" | "not_connected" | "mock";
  last_updated?: string | null;
  notes?: string | null;
};

export type SourceMetadata = {
  sources_used: SourceSystem[];
  expected_sources: string[];
};

type StatusMap = Record<string, { connected?: boolean; environment?: string }>;

const mockSource: SourceSystem = {
  system: "demo-fixture",
  status: "mock",
  last_updated: null,
  notes: "Local demo fixtures",
};

const ACCESS_EXPECTED: Record<string, string[]> = {
  ptl: ["PAS/EPR", "e-RS", "PTL Systems"],
  "waiting-list": ["PAS/EPR", "Outpatient Booking", "Theatre Scheduling"],
  "rtt-monitoring": ["PAS/EPR", "SUS/CDS", "BI Warehouse"],
  "cancer-pathways": ["Somerset", "InfoFlex", "Bluespier", "PAS/EPR"],
  "referral-management": ["e-RS", "GP Connect", "PAS/EPR"],
  "triage-status": ["e-RS", "Specialty Systems", "PAS/EPR"],
  "breach-tracking": ["PAS/EPR", "BI Warehouse"],
  "pathway-milestones": ["PAS/EPR"],
  "clock-starts-stops": ["PAS/EPR", "Audit Logs"],
  "validation-quality": ["PAS/EPR", "Data Quality Feeds"],
};

export const getAccessSources = (key: string, statuses?: StatusMap): SourceMetadata => {
  if (!statuses) {
    return { sources_used: [mockSource], expected_sources: ACCESS_EXPECTED[key] ?? [] };
  }
  const eprConnected = Boolean(statuses.epr?.connected);
  const eprSandbox = statuses.epr?.environment === "sandbox";
  const sources_used: SourceSystem[] = [
    {
      system: "EPR",
      status: eprSandbox ? "mock" : eprConnected ? "connected" : "not_connected",
      last_updated: null,
      notes: eprSandbox ? "Sandbox connector (fixtures or vendor test data)" : null,
    },
  ];
  return { sources_used, expected_sources: ACCESS_EXPECTED[key] ?? [] };
};
