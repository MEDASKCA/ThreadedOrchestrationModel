"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import {
  TrendingUp, BarChart2, FileText, Shield, RefreshCw, Search,
  LayoutGrid, Activity, Users, Calendar, AlertTriangle, CheckCircle, AlertCircle,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type AccessLog = {
  id: string;
  userId?: string;
  userName?: string;
  action?: string;
  targetType?: string;
  targetName?: string;
  timestamp?: { toDate?: () => Date; seconds?: number };
};

type TheatreList = {
  id: string;
  date?: string;
  theatreName?: string;
  specialty?: string;
  utilizationPercentage?: number;
  estimatedRevenue?: number;
  totalCases?: number;
  status?: string;
};

// ─── UTILITY HELPERS ─────────────────────────────────────────────────────────

function fmtTs(ts?: { toDate?: () => Date; seconds?: number }): string {
  if (!ts) return "--";
  try {
    const d = ts.toDate ? ts.toDate() : new Date((ts.seconds ?? 0) * 1000);
    return format(d, "dd MMM yyyy, HH:mm");
  } catch {
    return "--";
  }
}

function Rag({ s }: { s: string }) {
  const m: Record<string, [string, string, string]> = {
    green: ["#f0fdf4", "#16a34a", "Green"],
    amber: ["#fffbeb", "#d97706", "Amber"],
    red:   ["#fef2f2", "#dc2626", "Red"],
  };
  const [bg, fg, label] = m[s] ?? ["#f8fafc", "#94a3b8", s];
  return (
    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>
      {label}
    </span>
  );
}

function SevBadge({ s }: { s: string }) {
  const m: Record<string, [string, string]> = {
    High:   ["#fef2f2", "#dc2626"],
    Medium: ["#fffbeb", "#d97706"],
    Low:    ["#f0fdf4", "#16a34a"],
  };
  const [bg, fg] = m[s] ?? ["#f8fafc", "#94a3b8"];
  return <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>{s}</span>;
}

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, [string, string]> = {
    "Open":      ["#fef2f2", "#dc2626"],
    "In Review": ["#fffbeb", "#d97706"],
    "Resolved":  ["#f0fdf4", "#16a34a"],
  };
  const [bg, fg] = m[s] ?? ["#f8fafc", "#94a3b8"];
  return <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>{s}</span>;
}

function KpiCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  color: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
      <Icon style={{ width: 16, height: 16, color, marginBottom: 8 }} />
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>{label}</div>
    </div>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 56, height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 3, background: color }} />
      </div>
      <span style={{ fontSize: 13, color: "#475569" }}>{pct}%</span>
    </div>
  );
}

function DTable({ headers, rows, emptyLabel }: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "11px 16px", fontSize: 12, fontWeight: 700,
                  color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em",
                  background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  {emptyLabel ?? "No data available."}
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
              >
                {row.map((cell, j) => (
                  <td key={j} style={{
                    padding: "11px 16px", color: j === 0 ? "#0f172a" : "#475569",
                    fontWeight: j === 0 ? 600 : 400, whiteSpace: "nowrap",
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── STUB DATA ────────────────────────────────────────────────────────────────

const SPECIALTY_SCORECARD = [
  { specialty: "Orthopaedics",     cases: 142, target: 150, achievement: "94.7%",  breaches: 8,  dna: "6.2%", los: "3.1d", util: "87%", rag: "amber" },
  { specialty: "General Surgery",  cases: 198, target: 200, achievement: "99.0%",  breaches: 2,  dna: "4.8%", los: "2.4d", util: "92%", rag: "green" },
  { specialty: "Urology",          cases: 86,  target: 90,  achievement: "95.6%",  breaches: 4,  dna: "7.1%", los: "1.8d", util: "89%", rag: "amber" },
  { specialty: "Gynaecology",      cases: 74,  target: 80,  achievement: "92.5%",  breaches: 6,  dna: "9.3%", los: "1.6d", util: "83%", rag: "amber" },
  { specialty: "ENT",              cases: 112, target: 110, achievement: "101.8%", breaches: 0,  dna: "3.4%", los: "0.8d", util: "94%", rag: "green" },
  { specialty: "Ophthalmology",    cases: 230, target: 220, achievement: "104.5%", breaches: 0,  dna: "5.1%", los: "0.3d", util: "96%", rag: "green" },
  { specialty: "Vascular Surgery", cases: 38,  target: 45,  achievement: "84.4%",  breaches: 11, dna: "8.0%", los: "5.2d", util: "76%", rag: "red"   },
];

const CLINIC_PERFORMANCE = [
  { clinic: "Gen Surgery OPD", slots: 120, used: 112, dna: 8,  cancellations: 4, util: "93.3%", effectiveUtil: "86.7%", rag: "green" },
  { clinic: "Ortho OPD",       slots: 96,  used: 81,  dna: 12, cancellations: 3, util: "84.4%", effectiveUtil: "75.0%", rag: "amber" },
  { clinic: "Gynaecology OPD", slots: 64,  used: 55,  dna: 9,  cancellations: 2, util: "85.9%", effectiveUtil: "75.0%", rag: "amber" },
  { clinic: "Urology OPD",     slots: 80,  used: 74,  dna: 5,  cancellations: 1, util: "92.5%", effectiveUtil: "85.0%", rag: "green" },
  { clinic: "ENT OPD",         slots: 88,  used: 88,  dna: 3,  cancellations: 0, util: "100%",  effectiveUtil: "96.6%", rag: "green" },
  { clinic: "Vascular OPD",    slots: 48,  used: 32,  dna: 11, cancellations: 5, util: "66.7%", effectiveUtil: "41.7%", rag: "red"   },
];

const ACTIVITY_TRENDS = [
  { month: "Sep 2025", procedures: 412, theatreUtil: "82%", clinicUtil: "79%", breaches: 34, dna: "5.8%" },
  { month: "Oct 2025", procedures: 438, theatreUtil: "85%", clinicUtil: "81%", breaches: 28, dna: "5.2%" },
  { month: "Nov 2025", procedures: 401, theatreUtil: "80%", clinicUtil: "76%", breaches: 41, dna: "6.1%" },
  { month: "Dec 2025", procedures: 356, theatreUtil: "74%", clinicUtil: "70%", breaches: 52, dna: "7.4%" },
  { month: "Jan 2026", procedures: 447, theatreUtil: "87%", clinicUtil: "84%", breaches: 22, dna: "4.9%" },
  { month: "Feb 2026", procedures: 391, theatreUtil: "83%", clinicUtil: "80%", breaches: 29, dna: "5.5%" },
];

const DEMAND_FORECAST = [
  { specialty: "Orthopaedics",     currentQueue: 642, forecast90d: 180, capacity90d: 165, gap: "+15", rag: "amber" },
  { specialty: "General Surgery",  currentQueue: 218, forecast90d: 210, capacity90d: 215, gap: "-5",  rag: "green" },
  { specialty: "Urology",          currentQueue: 387, forecast90d: 95,  capacity90d: 90,  gap: "+5",  rag: "amber" },
  { specialty: "Gynaecology",      currentQueue: 291, forecast90d: 85,  capacity90d: 75,  gap: "+10", rag: "amber" },
  { specialty: "ENT",              currentQueue: 154, forecast90d: 120, capacity90d: 130, gap: "-10", rag: "green" },
  { specialty: "Ophthalmology",    currentQueue: 88,  forecast90d: 240, capacity90d: 250, gap: "-10", rag: "green" },
  { specialty: "Vascular Surgery", currentQueue: 193, forecast90d: 42,  capacity90d: 30,  gap: "+12", rag: "red"   },
];

const CAPACITY_PLANNING = [
  { week: "03 Mar 2026", demand: 98,  capacity: 102, variance: "+4",  forecastUtil: "96%",  rag: "green" },
  { week: "10 Mar 2026", demand: 104, capacity: 102, variance: "-2",  forecastUtil: "102%", rag: "amber" },
  { week: "17 Mar 2026", demand: 97,  capacity: 100, variance: "+3",  forecastUtil: "97%",  rag: "green" },
  { week: "24 Mar 2026", demand: 112, capacity: 102, variance: "-10", forecastUtil: "110%", rag: "red"   },
  { week: "31 Mar 2026", demand: 95,  capacity: 102, variance: "+7",  forecastUtil: "93%",  rag: "green" },
  { week: "07 Apr 2026", demand: 88,  capacity: 95,  variance: "+7",  forecastUtil: "93%",  rag: "green" },
  { week: "14 Apr 2026", demand: 101, capacity: 95,  variance: "-6",  forecastUtil: "106%", rag: "amber" },
  { week: "21 Apr 2026", demand: 99,  capacity: 95,  variance: "-4",  forecastUtil: "104%", rag: "amber" },
];

const BREACH_TREND = [
  { month: "Sep 2025", ortho: 10, genSurgery: 4, urology: 6, gynae: 5, ent: 2, vascular: 7,  total: 34 },
  { month: "Oct 2025", ortho: 8,  genSurgery: 3, urology: 5, gynae: 4, ent: 1, vascular: 7,  total: 28 },
  { month: "Nov 2025", ortho: 12, genSurgery: 5, urology: 7, gynae: 7, ent: 2, vascular: 8,  total: 41 },
  { month: "Dec 2025", ortho: 15, genSurgery: 8, urology: 9, gynae: 9, ent: 3, vascular: 8,  total: 52 },
  { month: "Jan 2026", ortho: 6,  genSurgery: 2, urology: 4, gynae: 3, ent: 0, vascular: 7,  total: 22 },
  { month: "Feb 2026", ortho: 8,  genSurgery: 2, urology: 4, gynae: 6, ent: 0, vascular: 9,  total: 29 },
];

const RTT_REPORT = [
  { specialty: "Orthopaedics",     incomplete: 642, within18w: 582, beyond18w: 60,  compliance: "90.7%", change: "+0.8%", rag: "amber" },
  { specialty: "General Surgery",  incomplete: 218, within18w: 215, beyond18w: 3,   compliance: "98.6%", change: "+1.2%", rag: "green" },
  { specialty: "Urology",          incomplete: 387, within18w: 367, beyond18w: 20,  compliance: "94.8%", change: "-0.3%", rag: "amber" },
  { specialty: "Gynaecology",      incomplete: 291, within18w: 268, beyond18w: 23,  compliance: "92.1%", change: "-1.1%", rag: "amber" },
  { specialty: "ENT",              incomplete: 154, within18w: 153, beyond18w: 1,   compliance: "99.4%", change: "+0.5%", rag: "green" },
  { specialty: "Ophthalmology",    incomplete: 88,  within18w: 88,  beyond18w: 0,   compliance: "100%",  change: "0.0%",  rag: "green" },
  { specialty: "Vascular Surgery", incomplete: 193, within18w: 151, beyond18w: 42,  compliance: "78.2%", change: "-2.4%", rag: "red"   },
];

const CANCER_REPORT = [
  { pathway: "2WW - Breast",       referred: 48, seenIn14d: 46, treatmentStart: 42, compliance62d: "92.9%", rag: "green" },
  { pathway: "2WW - Colorectal",   referred: 34, seenIn14d: 32, treatmentStart: 28, compliance62d: "82.4%", rag: "amber" },
  { pathway: "2WW - Urology",      referred: 27, seenIn14d: 26, treatmentStart: 24, compliance62d: "88.9%", rag: "amber" },
  { pathway: "2WW - Gynaecology",  referred: 19, seenIn14d: 19, treatmentStart: 17, compliance62d: "89.5%", rag: "amber" },
  { pathway: "2WW - Skin",         referred: 82, seenIn14d: 81, treatmentStart: 78, compliance62d: "95.1%", rag: "green" },
  { pathway: "Consultant Upgrade", referred: 14, seenIn14d: 14, treatmentStart: 11, compliance62d: "78.6%", rag: "red"   },
];

const MONTHLY_REPORT = [
  { metric: "Total Procedures",       value: "391",   target: "420",   variance: "-29",    variancePct: "-6.9%",  rag: "amber" },
  { metric: "Theatre Utilisation",    value: "83%",   target: "85%",   variance: "-2pp",   variancePct: "-2.4%",  rag: "amber" },
  { metric: "RTT Compliance",         value: "92.8%", target: "92.0%", variance: "+0.8pp", variancePct: "+0.9%",  rag: "green" },
  { metric: "Cancer 62-Day",          value: "87.3%", target: "85.0%", variance: "+2.3pp", variancePct: "+2.7%",  rag: "green" },
  { metric: "DNA Rate",               value: "5.5%",  target: "5.0%",  variance: "+0.5pp", variancePct: "+10.0%", rag: "amber" },
  { metric: "Same-Day Cancellations", value: "18",    target: "15",    variance: "+3",     variancePct: "+20.0%", rag: "amber" },
  { metric: "Delayed Discharges",     value: "9",     target: "5",     variance: "+4",     variancePct: "+80.0%", rag: "red"   },
  { metric: "Avg LOS (Elective)",     value: "2.6d",  target: "2.5d",  variance: "+0.1d",  variancePct: "+4.0%",  rag: "amber" },
];

const DATA_QUALITY = [
  { type: "Missing OPCS Code",         count: 23, area: "Orthopaedics",    severity: "High",   status: "Open",      lastReview: "24 Feb 2026" },
  { type: "RTT Clock Discrepancy",     count: 8,  area: "General Surgery", severity: "High",   status: "In Review", lastReview: "25 Feb 2026" },
  { type: "Incomplete Referral Data",  count: 41, area: "Multi-Specialty", severity: "Medium", status: "Open",      lastReview: "23 Feb 2026" },
  { type: "Duplicate Patient Records", count: 5,  area: "PAS",             severity: "High",   status: "Resolved",  lastReview: "22 Feb 2026" },
  { type: "Missing Discharge Date",    count: 17, area: "Vascular Surgery",severity: "Medium", status: "Open",      lastReview: "24 Feb 2026" },
  { type: "Invalid Specialty Code",    count: 3,  area: "Coding Dept",     severity: "Low",    status: "Resolved",  lastReview: "21 Feb 2026" },
  { type: "Unmatched Theatre Session", count: 12, area: "Session Planner", severity: "Medium", status: "In Review", lastReview: "26 Feb 2026" },
];

// ─── NAV GROUPS ──────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    key: "performance",
    label: "Performance Insights",
    icon: TrendingUp,
    items: [
      { key: "overview",           label: "Overview",             icon: LayoutGrid  },
      { key: "theatrePerf",        label: "Theatre Performance",  icon: Activity    },
      { key: "specialtyScorecard", label: "Specialty Scorecard",  icon: Users       },
      { key: "clinicPerf",         label: "Clinic Performance",   icon: Calendar    },
    ],
  },
  {
    key: "trends",
    label: "Trends & Forecasting",
    icon: BarChart2,
    items: [
      { key: "activityTrends",   label: "Activity Trends",       icon: Activity      },
      { key: "demandForecast",   label: "Demand Forecast",       icon: Calendar      },
      { key: "capacityPlanning", label: "Capacity Planning",     icon: TrendingUp    },
      { key: "breachTrend",      label: "Breach Trend Analysis", icon: AlertTriangle },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
    items: [
      { key: "executiveSummary", label: "Executive Summary",         icon: FileText    },
      { key: "rttReport",        label: "RTT Compliance Report",     icon: CheckCircle },
      { key: "cancerReport",     label: "Cancer Pathway Report",     icon: AlertCircle },
      { key: "monthlyReport",    label: "Monthly Performance Report",icon: FileText    },
    ],
  },
  {
    key: "audit",
    label: "Audit & Governance",
    icon: Shield,
    items: [
      { key: "auditLog",    label: "Activity Audit Log", icon: Shield      },
      { key: "tomAudit",    label: "TOM Audit Log",      icon: Activity    },
      { key: "dataQuality", label: "Data Quality Audit", icon: CheckCircle },
      { key: "accessLog",   label: "Access Log",         icon: Users       },
    ],
  },
] as const;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function IntelligenceSection({
  deepLink,
  hideNav,
}: {
  deepLink?: { view?: string; filters?: Record<string, string> };
  hideNav?: boolean;
}) {
  const [activeView, setActiveView]     = useState("overview");
  const [search, setSearch]             = useState("");
  const [isMobile, setIsMobile]         = useState(false);
  const [mobileView, setMobileView]     = useState<"list" | "detail">("list");
  const [logs, setLogs]                 = useState<AccessLog[]>([]);
  const [theatreLists, setTheatreLists] = useState<TheatreList[]>([]);
  const [tomAuditData, setTomAuditData] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.key === activeView));
  const activeItem  = activeGroup?.items.find(i => i.key === activeView);

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setMobileView("list");
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!deepLink) return;
    if (deepLink.view) setActiveView(deepLink.view);
  }, [deepLink]);

  async function fetchData() {
    setRefreshing(true);
    try {
      const [logsSnap, tlSnap, tomRes] = await Promise.all([
        getDocs(query(collection(db, "messengerAuditLog"), orderBy("timestamp", "desc"), limit(50))),
        getDocs(query(collection(db, "theatreLists"), orderBy("date", "desc"), limit(30))),
        fetch("/api/tom/audit"),
      ]);
      setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AccessLog)));
      setTheatreLists(tlSnap.docs.map(d => ({ id: d.id, ...d.data() } as TheatreList)));
      try {
        const data = await tomRes.json();
        setTomAuditData(data.logs || []);
      } catch {
        setTomAuditData([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Derived stats for overview
  const avgUtil      = theatreLists.length
    ? Math.round(theatreLists.reduce((a, t) => a + (t.utilizationPercentage ?? 0), 0) / theatreLists.length)
    : 0;
  const totalCases   = theatreLists.reduce((a, t) => a + (t.totalCases ?? 0), 0);
  const totalRevenue = theatreLists.reduce((a, t) => a + (t.estimatedRevenue ?? 0), 0);

  const PAD: React.CSSProperties = { padding: "20px 24px", overflowY: "auto", height: "100%" };

  const loadingSkel = (
    <div style={PAD}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse" style={{ height: 44, borderRadius: 10, background: "#e2e8f0", marginBottom: 8 }} />
      ))}
    </div>
  );

  // ── VIEW COMPONENTS ────────────────────────────────────────────────────────

  const VIEW_COMPONENTS: Record<string, React.ReactElement> = {

    // ── Overview ────────────────────────────────────────────────────────────
    overview: loading ? loadingSkel : (
      <div style={PAD}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Theatre Lists"   value={theatreLists.length}            icon={BarChart2}  color="#0ea5e9" />
          <KpiCard label="Avg Utilisation" value={`${avgUtil}%`}                  icon={TrendingUp} color="#22c55e" />
          <KpiCard label="Total Cases"     value={totalCases}                      icon={FileText}   color="#8b5cf6" />
          <KpiCard label="Audit Events"    value={logs.length + tomAuditData.length} icon={Shield}  color="#f59e0b" />
        </div>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Theatre Lists
        </div>
        <DTable
          headers={["Date", "Theatre", "Specialty", "Cases", "Utilisation", "Est. Revenue", "Status"]}
          rows={theatreLists.map(t => [
            t.date ?? "--",
            t.theatreName ?? "--",
            t.specialty ?? "--",
            t.totalCases ?? 0,
            `${t.utilizationPercentage ?? 0}%`,
            t.estimatedRevenue ? `GBP ${t.estimatedRevenue.toLocaleString()}` : "--",
            <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#f0fdf4", color: "#16a34a" }}>
              {t.status ?? "--"}
            </span>,
          ])}
          emptyLabel="No theatre list data found."
        />
      </div>
    ),

    // ── Theatre Performance ──────────────────────────────────────────────────
    theatrePerf: loading ? loadingSkel : (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Theatre Utilisation by List
        </div>
        <DTable
          headers={["Date", "Theatre", "Specialty", "Cases", "Utilisation", "Est. Revenue"]}
          rows={theatreLists.map(t => [
            t.date ?? "--",
            t.theatreName ?? "--",
            t.specialty ?? "--",
            t.totalCases ?? 0,
            <UtilBar pct={t.utilizationPercentage ?? 0} />,
            t.estimatedRevenue ? `GBP ${t.estimatedRevenue.toLocaleString()}` : "--",
          ])}
          emptyLabel="No theatre performance data found."
        />
      </div>
    ),

    // ── Specialty Scorecard ──────────────────────────────────────────────────
    specialtyScorecard: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Specialty Performance Scorecard - February 2026
        </div>
        <DTable
          headers={["Specialty", "Cases", "Target", "Achievement", "Breaches", "DNA Rate", "Avg LOS", "Utilisation", "RAG"]}
          rows={SPECIALTY_SCORECARD.map(r => [
            r.specialty, r.cases, r.target, r.achievement, r.breaches,
            r.dna, r.los, r.util, <Rag s={r.rag} />,
          ])}
        />
      </div>
    ),

    // ── Clinic Performance ───────────────────────────────────────────────────
    clinicPerf: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Clinic Performance - February 2026
        </div>
        <DTable
          headers={["Clinic", "Slots", "Used", "DNA", "Cancellations", "Utilisation", "Effective Util", "RAG"]}
          rows={CLINIC_PERFORMANCE.map(r => [
            r.clinic, r.slots, r.used, r.dna, r.cancellations,
            r.util, r.effectiveUtil, <Rag s={r.rag} />,
          ])}
        />
      </div>
    ),

    // ── Activity Trends ──────────────────────────────────────────────────────
    activityTrends: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          6-Month Activity Trends
        </div>
        <DTable
          headers={["Month", "Procedures", "Theatre Util", "Clinic Util", "Breaches", "DNA Rate"]}
          rows={ACTIVITY_TRENDS.map(r => [
            r.month, r.procedures, r.theatreUtil, r.clinicUtil, r.breaches, r.dna,
          ])}
        />
      </div>
    ),

    // ── Demand Forecast ──────────────────────────────────────────────────────
    demandForecast: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          90-Day Demand Forecast by Specialty
        </div>
        <DTable
          headers={["Specialty", "Current Queue", "Forecast (90d)", "Capacity (90d)", "Gap", "RAG"]}
          rows={DEMAND_FORECAST.map(r => [
            r.specialty, r.currentQueue, r.forecast90d, r.capacity90d,
            <span style={{ color: r.gap.startsWith("-") ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{r.gap}</span>,
            <Rag s={r.rag} />,
          ])}
        />
      </div>
    ),

    // ── Capacity Planning ────────────────────────────────────────────────────
    capacityPlanning: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          8-Week Forward Capacity Plan
        </div>
        <DTable
          headers={["Week", "Projected Demand", "Planned Capacity", "Variance", "Forecast Util", "RAG"]}
          rows={CAPACITY_PLANNING.map(r => [
            r.week, r.demand, r.capacity,
            <span style={{ color: r.variance.startsWith("+") ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{r.variance}</span>,
            r.forecastUtil, <Rag s={r.rag} />,
          ])}
        />
      </div>
    ),

    // ── Breach Trend Analysis ────────────────────────────────────────────────
    breachTrend: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          RTT Breach Trends by Specialty - 6 Months
        </div>
        <DTable
          headers={["Month", "Orthopaedics", "Gen Surgery", "Urology", "Gynaecology", "ENT", "Vascular", "Total"]}
          rows={BREACH_TREND.map(r => [
            r.month, r.ortho, r.genSurgery, r.urology, r.gynae, r.ent, r.vascular,
            <strong style={{ color: r.total > 40 ? "#dc2626" : r.total > 25 ? "#d97706" : "#16a34a" }}>{r.total}</strong>,
          ])}
        />
      </div>
    ),

    // ── Executive Summary ────────────────────────────────────────────────────
    executiveSummary: (
      <div style={PAD}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard label="RTT Compliance"    value="92.8%" icon={CheckCircle}  color="#22c55e" />
          <KpiCard label="Theatre Util"      value="83%"   icon={Activity}     color="#0ea5e9" />
          <KpiCard label="Cancer 62-Day"     value="87.3%" icon={AlertCircle}  color="#22c55e" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <KpiCard label="DNA Rate"                value="5.5%" icon={AlertTriangle} color="#f59e0b" />
          <KpiCard label="Same-Day Cancellations"  value="18"   icon={AlertTriangle} color="#f59e0b" />
          <KpiCard label="Delayed Discharges"      value="9"    icon={Shield}        color="#dc2626" />
        </div>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Monthly Performance Summary - February 2026
        </div>
        <DTable
          headers={["Metric", "Value", "Target", "Variance", "Variance %", "RAG"]}
          rows={MONTHLY_REPORT.map(r => [r.metric, r.value, r.target, r.variance, r.variancePct, <Rag s={r.rag} />])}
        />
      </div>
    ),

    // ── RTT Compliance Report ────────────────────────────────────────────────
    rttReport: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          RTT Incomplete Pathways Report - February 2026
        </div>
        <DTable
          headers={["Specialty", "Incomplete Pathways", "Within 18 Weeks", "Beyond 18 Weeks", "Compliance", "Monthly Change", "RAG"]}
          rows={RTT_REPORT.map(r => [
            r.specialty, r.incomplete, r.within18w, r.beyond18w,
            <strong>{r.compliance}</strong>,
            <span style={{ color: r.change.startsWith("+") ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{r.change}</span>,
            <Rag s={r.rag} />,
          ])}
        />
      </div>
    ),

    // ── Cancer Pathway Report ────────────────────────────────────────────────
    cancerReport: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Cancer Pathway Compliance Report - February 2026
        </div>
        <DTable
          headers={["Pathway", "Referred", "Seen Within 14d", "Treatment Started", "62-Day Compliance", "RAG"]}
          rows={CANCER_REPORT.map(r => [
            r.pathway, r.referred, r.seenIn14d, r.treatmentStart,
            <strong>{r.compliance62d}</strong>,
            <Rag s={r.rag} />,
          ])}
        />
      </div>
    ),

    // ── Monthly Performance Report ───────────────────────────────────────────
    monthlyReport: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Monthly Performance Report - February 2026
        </div>
        <DTable
          headers={["Metric", "Value", "Target", "Variance", "Variance %", "RAG"]}
          rows={MONTHLY_REPORT.map(r => [r.metric, r.value, r.target, r.variance, r.variancePct, <Rag s={r.rag} />])}
        />
      </div>
    ),

    // ── Activity Audit Log ───────────────────────────────────────────────────
    auditLog: loading ? loadingSkel : (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Activity Audit Log
        </div>
        <DTable
          headers={["Timestamp", "User", "Action", "Target"]}
          rows={logs.map(l => [
            fmtTs(l.timestamp),
            l.userName ?? l.userId ?? "--",
            <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#eff6ff", color: "#3b82f6" }}>
              {l.action ?? "--"}
            </span>,
            l.targetName ?? l.targetType ?? "--",
          ])}
          emptyLabel="No audit logs found."
        />
      </div>
    ),

    // ── TOM Audit Log ────────────────────────────────────────────────────────
    tomAudit: loading ? loadingSkel : (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          TOM Audit Log
        </div>
        <DTable
          headers={["Timestamp", "User", "Action", "Tools Called"]}
          rows={tomAuditData.map(l => [
            l.timestamp ? format(new Date(l.timestamp), "dd MMM yyyy, HH:mm") : "--",
            l.userId ?? "--",
            <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#eff6ff", color: "#3b82f6" }}>
              {l.actionType ?? "--"}
            </span>,
            Array.isArray(l.toolsCalled) ? l.toolsCalled.join(", ") : "--",
          ])}
          emptyLabel="No TOM audit logs found."
        />
      </div>
    ),

    // ── Data Quality Audit ───────────────────────────────────────────────────
    dataQuality: (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Data Quality Issues
        </div>
        <DTable
          headers={["Issue Type", "Count", "Area", "Severity", "Status", "Last Review"]}
          rows={DATA_QUALITY.map(r => [
            r.type, r.count, r.area,
            <SevBadge s={r.severity} />,
            <StatusBadge s={r.status} />,
            r.lastReview,
          ])}
        />
      </div>
    ),

    // ── Access Log ───────────────────────────────────────────────────────────
    accessLog: loading ? loadingSkel : (
      <div style={PAD}>
        <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Access Log
        </div>
        <DTable
          headers={["Timestamp", "User", "Action", "Resource"]}
          rows={logs.map(l => [
            fmtTs(l.timestamp),
            l.userName ?? l.userId ?? "--",
            <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#f0f9ff", color: "#0ea5e9" }}>
              {l.action ?? "--"}
            </span>,
            l.targetName ?? l.targetType ?? "--",
          ])}
          emptyLabel="No access log entries found."
        />
      </div>
    ),
  };

  // ── MOBILE ────────────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div style={{ height: "100%", background: "#f4f6f9", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {mobileView === "list" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {NAV_GROUPS.map(group => (
              <div key={group.key} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {group.label}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {group.items.map(item => (
                    <button
                      key={item.key}
                      onClick={() => { setActiveView(item.key); setMobileView("detail"); }}
                      style={{
                        width: "100%", textAlign: "left", padding: "10px 12px",
                        borderRadius: 12, border: "1px solid #e2e8f0",
                        background: activeView === item.key ? "#f0f9ff" : "#ffffff",
                        color: activeView === item.key ? "#0ea5e9" : "#0f172a",
                        fontSize: 14, fontWeight: activeView === item.key ? 600 : 500, cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "12px 16px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setMobileView("list")}
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", background: "#f8fafc", color: "#0f172a", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Back
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{activeItem?.label}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {VIEW_COMPONENTS[activeView] ?? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 16 }}>
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 32px", textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{activeItem?.label}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>View content will appear here.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full" style={{ background: "#f4f6f9" }}>

      {/* Left nav */}
      {!hideNav && (
        <div style={{ width: 260, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e2e8f0",
          overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: 60 }}>
          {NAV_GROUPS.map(group => {
            const GroupIcon = group.icon;
            return (
              <div key={group.key}>
                <div style={{ padding: "12px 14px 8px", display: "flex", alignItems: "center", gap: 7, background: "#94a3b8" }}>
                  <GroupIcon style={{ width: 12, height: 12, color: "#ffffff", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {group.label}
                  </span>
                </div>
                {group.items.map(item => {
                  const ItemIcon = item.icon;
                  const isActive = activeView === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveView(item.key); setSearch(""); }}
                      style={{
                        width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9,
                        padding: "7px 14px 7px 24px",
                        background: isActive ? "#f0f9ff" : "transparent",
                        color: isActive ? "#0ea5e9" : "#475569",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 16, border: "none", cursor: "pointer",
                        borderLeft: isActive ? "3px solid #0ea5e9" : "3px solid transparent",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <ItemIcon style={{ width: 14, height: 14, flexShrink: 0, color: isActive ? "#0ea5e9" : "#94a3b8" }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{
          padding: "11px 20px", background: "#ffffff", borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          backgroundImage: "linear-gradient(90deg, rgba(14,165,233,0.55) 0%, rgba(14,165,233,0.0) 70%)",
        }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", padding: "2px 0" }}>
            {activeGroup && activeItem
              ? <>{activeGroup.label}<span style={{ fontWeight: 700, color: "#0f172a", margin: "0 4px" }}>:</span>{activeItem.label}</>
              : "Intelligence"}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={fetchData}
            disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8",
              background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 16, color: "#0f172a",
                background: "#f8fafc", outline: "none", width: 240 }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {VIEW_COMPONENTS[activeView] ?? (
            <div className="h-full flex items-center justify-center">
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{activeItem?.label}</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>View content will appear here.</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
