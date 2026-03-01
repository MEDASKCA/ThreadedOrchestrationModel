"use client";

const SECTION_NAV: Record<string, {
  label: string;
  groups: Array<{
    key: string;
    label: string;
    items: Array<{ key: string; label: string }>;
  }>;
}> = {
  operations: {
    label: "Operations",
    groups: [
      {
        key: "access", label: "Access & Pathways",
        items: [
          { key: "ptl",        label: "PTL" },
          { key: "waiting",    label: "Waiting List" },
          { key: "rtt",        label: "RTT Monitoring" },
          { key: "cancer",     label: "Cancer Pathways (2WW)" },
          { key: "referrals",  label: "Referral Management" },
          { key: "triage",     label: "Triage Status" },
          { key: "breach",     label: "Breach Tracking" },
          { key: "milestones", label: "Pathway Milestones" },
          { key: "clock",      label: "Clock Starts / Stops" },
          { key: "validation", label: "Validation & Data Quality" },
        ],
      },
      {
        key: "capacity", label: "Capacity",
        items: [
          { key: "beds",            label: "Bed Management" },
          { key: "wardCapacity",    label: "Ward Capacity" },
          { key: "icuCapacity",     label: "ICU Capacity" },
          { key: "theatreCapacity", label: "Theatre Capacity" },
          { key: "clinicSlots",     label: "Clinic Slot Availability" },
          { key: "sessionPlanner",  label: "Session Planner" },
          { key: "templateUtil",    label: "Template Utilisation" },
          { key: "surge",           label: "Surge Planning" },
          { key: "forwardCapacity", label: "7-Day Forward Capacity" },
        ],
      },
      {
        key: "activity", label: "Activity & Performance",
        items: [
          { key: "dailyVsPlan",   label: "Daily Activity vs Plan" },
          { key: "theatreUtil",   label: "Theatre Utilisation" },
          { key: "clinicUtil",    label: "Clinic Utilisation" },
          { key: "dna",           label: "DNA Rates" },
          { key: "cancellations", label: "Cancellation Rates" },
          { key: "breachPerf",    label: "Breach Performance" },
          { key: "targets",       label: "Performance vs Targets" },
          { key: "variance",      label: "Variance Analysis" },
          { key: "specialtyPerf", label: "Specialty Performance" },
          { key: "solari",        label: "Solari Board" },
        ],
      },
      {
        key: "procedures", label: "Procedures",
        items: [
          { key: "opcs",           label: "OPCS Tracking" },
          { key: "procedureReqs",  label: "Procedure Requirements" },
          { key: "preop",          label: "Pre-Op Checklist Status" },
          { key: "coding",         label: "Procedure Coding" },
          { key: "durationTrends", label: "Procedure Duration Trends" },
          { key: "theatreList",    label: "Theatre List Composition" },
          { key: "backlog",        label: "Backlog by Procedure Type" },
        ],
      },
      {
        key: "flow", label: "Flow & Escalation",
        items: [
          { key: "delayedDischarge", label: "Delayed Discharges" },
          { key: "transfers",        label: "Internal Transfers" },
          { key: "blockedBeds",      label: "Blocked Beds" },
          { key: "capacityAlerts",   label: "Capacity Alerts" },
          { key: "opel",             label: "Escalation Level (OPEL)" },
          { key: "incidentFlags",    label: "Incident Flags" },
          { key: "emergency",        label: "Emergency Pressure Indicators" },
          { key: "sameDayCancel",    label: "Same-Day Cancellations" },
          { key: "riskFeed",         label: "Real-Time Risk Feed" },
        ],
      },
    ],
  },

  logistics: {
    label: "Logistics",
    groups: [
      {
        key: "workforce", label: "Workforce",
        items: [
          { key: "roster",      label: "Roster" },
          { key: "allocation",  label: "Allocation" },
          { key: "fte",         label: "FTE Management" },
          { key: "staffFinder", label: "Staff Finder" },
          { key: "shifts",      label: "Shift Management" },
          { key: "absence",     label: "Absence Tracking" },
        ],
      },
      {
        key: "supplies", label: "Supplies & Equipment",
        items: [
          { key: "catalogue",  label: "Product Catalogue" },
          { key: "equipment",  label: "Equipment Register" },
          { key: "assetTrack", label: "Asset Tracking" },
          { key: "procurement",label: "Procurement Requests" },
          { key: "specs",      label: "Product Specifications" },
          { key: "suppliers",  label: "Supplier Information" },
        ],
      },
      {
        key: "inventory", label: "Inventory",
        items: [
          { key: "stockLevels", label: "Stock Levels" },
          { key: "warehousing", label: "Warehousing" },
          { key: "distribution",label: "Distribution" },
          { key: "returns",     label: "Returns" },
          { key: "expiry",      label: "Expiry & Batch Tracking" },
          { key: "stockAdj",    label: "Stock Adjustments" },
          { key: "assetMove",   label: "Asset Movement Tracking" },
        ],
      },
      {
        key: "deployment", label: "Deployment & Coverage",
        items: [
          { key: "staffCoverage",    label: "Staff Coverage" },
          { key: "equipmentCoverage",label: "Equipment Coverage" },
          { key: "spaceCoverage",    label: "Space / Room Coverage" },
          { key: "coverageRisk",     label: "Coverage Risk" },
          { key: "coverageTimeline", label: "Today / Tomorrow / 7-Day" },
        ],
      },
    ],
  },

  collaboration: {
    label: "Collaboration",
    groups: [
      {
        key: "forum", label: "Forum",
        items: [
          { key: "forum_all_threads", label: "All Threads" },
          { key: "forum_by_topic",    label: "By Category" },
          { key: "forum_trending",    label: "Trending" },
          { key: "forum_pinned",      label: "Pinned / Announcements" },
        ],
      },
      {
        key: "deliverables", label: "Deliverables",
        items: [
          { key: "deliverables_my",       label: "My Deliverables" },
          { key: "deliverables_team",     label: "Team Deliverables" },
          { key: "deliverables_at_risk",  label: "At Risk" },
          { key: "deliverables_overdue",  label: "Overdue" },
        ],
      },
      {
        key: "escalations", label: "Escalations",
        items: [
          { key: "escalations_active",   label: "Active" },
          { key: "escalations_breaches", label: "Breaches" },
          { key: "escalations_critical", label: "Critical" },
        ],
      },
      {
        key: "mywork", label: "My Work",
        items: [
          { key: "my_assigned", label: "Assigned to Me" },
          { key: "my_awaiting", label: "Awaiting My Response" },
        ],
      },
      {
        key: "huddle", label: "Huddle & Briefing",
        items: [
          { key: "brief_today", label: "Today" },
          { key: "brief_7day",  label: "7-Day Forward" },
          { key: "brief_risks", label: "Auto-Risks" },
        ],
      },
      {
        key: "governance", label: "Governance Log",
        items: [
          { key: "governance_activity", label: "Activity Feed" },
          { key: "governance_audit",    label: "Audit Log" },
        ],
      },
    ],
  },

  intelligence: {
    label: "Intelligence",
    groups: [
      {
        key: "intel", label: "Intelligence",
        items: [
          { key: "Overview",   label: "Overview" },
          { key: "Analytics",  label: "Analytics" },
          { key: "Reports",    label: "Reports" },
          { key: "Audit Logs", label: "Audit Logs" },
          { key: "TOM Audit",  label: "TOM Audit" },
        ],
      },
    ],
  },

  apps: {
    label: "Apps",
    groups: [
      {
        key: "builder",
        label: "Applications",
        items: [
          { key: "templateBuilder", label: "Template Builder" },
        ],
      },
    ],
  },

  configurator: {
    label: "Configurator",
    groups: [
      {
        key: "config", label: "Settings",
        items: [
          { key: "Hospitals",    label: "Hospitals" },
          { key: "Procedures",   label: "Procedures" },
          { key: "Permissions",  label: "Permissions" },
          { key: "Integrations", label: "Integrations" },
          { key: "Profile",      label: "Profile" },
        ],
      },
    ],
  },
};

export default function SecondaryNavSidebar({
  sectionKey,
  activeView,
  onSelectView,
}: {
  sectionKey: string;
  activeView: string | null;
  onSelectView: (viewKey: string) => void;
}) {
  const section = SECTION_NAV[sectionKey];
  if (!section) return null;

  return (
    <aside
      className="shrink-0 flex flex-col h-full overflow-hidden"
      style={{ width: 220, background: "#ffffff", borderRight: "1px solid #dde3ed" }}
    >
      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto py-2">
        {section.groups.map((group) => (
          <div key={group.key} className="mb-0">
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{ background: "#94a3b8" }}
            >
              <span className="text-[16px] font-bold text-white uppercase tracking-[0.06em]">
                {group.label}
              </span>
            </div>
            {group.items.map((item) => {
              const isActive = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelectView(item.key)}
                  className="w-full text-left px-4 py-1.5 text-[16px] transition-colors relative"
                  style={{
                    color:      isActive ? "#0ea5e9" : "#475569",
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? "#f0f9ff" : "transparent",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#e0f2fe"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                      style={{ background: "#0ea5e9" }}
                    />
                  )}
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
