"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parseISO } from "date-fns";
import { RefreshCw } from "lucide-react";

type RosterShift = {
  id: string;
  staffName?: string;
  role?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  contractType?: string;
};

type Session = {
  id: string;
  date?: string;
  theatreRoomName?: string;
  specialty?: string;
  status?: string;
  cases?: unknown[];
};

const tabs = ["Roster", "Schedule", "Workforce", "Staff Allocation"];

export default function PlanningSection() {
  const [activeTab, setActiveTab] = useState("Roster");
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    setRefreshing(true);
    try {
      const [shiftsSnap, sessSnap] = await Promise.all([
        getDocs(query(collection(db, "rosterShifts"), orderBy("date", "desc"), limit(30))),
        getDocs(query(collection(db, "sessions"), orderBy("date", "asc"), limit(20))),
      ]);
      setShifts(shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RosterShift)));
      setSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const fmtDate = (d?: string) => {
    if (!d) return "—";
    try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#f4f6f9" }}>

      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Logistics</h1>
          <p className="text-[17px] text-[#94a3b8]">Roster management, theatre scheduling, and workforce planning.</p>
        </div>
        <button onClick={fetchData} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#0ea5e9] transition-colors mt-1">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="px-8 pb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Roster Shifts", value: shifts.length, color: "#0ea5e9" },
          { label: "Upcoming Sessions", value: sessions.filter(s => (s.date ?? "") >= new Date().toISOString().split("T")[0]).length, color: "#8b5cf6" },
          { label: "Unscheduled Cases", value: "—", color: "#f59e0b" },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#dde3ed] rounded-xl p-4">
            <div className="text-2xl font-bold mb-0.5" style={{ color: card.color }}>
              {loading ? "—" : card.value}
            </div>
            <div className="text-xs text-[#94a3b8]">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="px-8">
        <div className="flex items-center gap-1 border-b border-[#dde3ed]">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium transition-colors relative"
              style={{ color: activeTab === tab ? "#0ea5e9" : "#64748b" }}>
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#0ea5e9" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pt-5 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white border border-[#dde3ed] animate-pulse" />
            ))}
          </div>
        ) : activeTab === "Roster" ? (
          <div className="bg-white border border-[#dde3ed] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #dde3ed", background: "#f8fafc" }}>
                  {["Staff Name", "Role", "Date", "Start", "End", "Contract"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94a3b8] text-sm">No roster shifts found.</td></tr>
                ) : shifts.map((s, i) => (
                  <tr key={s.id} className="hover:bg-[#f8fafc] transition-colors"
                    style={{ borderBottom: i < shifts.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-4 py-3 text-[#0f172a] font-medium">{s.staffName ?? "—"}</td>
                    <td className="px-4 py-3 text-[#475569]">{s.role ?? "—"}</td>
                    <td className="px-4 py-3 text-[#475569]">{fmtDate(s.date)}</td>
                    <td className="px-4 py-3 text-[#475569]">{s.startTime ?? "—"}</td>
                    <td className="px-4 py-3 text-[#475569]">{s.endTime ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ background: "#eff6ff", color: "#3b82f6" }}>{s.contractType ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "Schedule" ? (
          <div className="bg-white border border-[#dde3ed] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #dde3ed", background: "#f8fafc" }}>
                  {["Date", "Theatre", "Specialty", "Cases", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94a3b8] text-sm">No sessions found.</td></tr>
                ) : sessions.map((s, i) => (
                  <tr key={s.id} className="hover:bg-[#f8fafc] transition-colors"
                    style={{ borderBottom: i < sessions.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-4 py-3 text-[#0f172a] font-medium whitespace-nowrap">{fmtDate(s.date)}</td>
                    <td className="px-4 py-3 text-[#475569]">{s.theatreRoomName ?? "—"}</td>
                    <td className="px-4 py-3 text-[#475569]">{s.specialty ?? "—"}</td>
                    <td className="px-4 py-3 text-[#0f172a]">{s.cases?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ background: "#eff6ff", color: "#3b82f6" }}>{s.status ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[#94a3b8]">{activeTab} coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
