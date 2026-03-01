"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Building2, Stethoscope, Users, Key, Plug } from "lucide-react";
import ConnectorsSection from "@/components/sections/ConnectorsSection";

type Hospital = {
  id: string;
  name?: string;
  trustName?: string;
  address?: string;
  isActive?: boolean;
  theatreCount?: number;
  staffCount?: number;
};

const tabs = ["Hospitals", "Procedures", "Permissions", "Integrations", "Profile"];

export default function SettingsSection({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab ?? "Hospitals");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const snap = await getDocs(query(collection(db, "hospitals"), limit(20)));
        setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (initialTab && tabs.includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const settingsGroups = [
    {
      icon: Building2,
      title: "Site Configuration",
      description: "Manage hospitals, theatre rooms, and site-level settings.",
      tab: "Hospitals",
      color: "#0ea5e9",
    },
    {
      icon: Stethoscope,
      title: "Procedures & OPCS-4",
      description: "Procedure library, preference cards, and consultant linkage.",
      tab: "Procedures",
      color: "#8b5cf6",
    },
    {
      icon: Users,
      title: "Permissions & Roles",
      description: "Ingress levels, role management, and access control.",
      tab: "Permissions",
      color: "#22c55e",
    },
    {
      icon: Plug,
      title: "Integrations",
      description: "NHS ecosystem connectors, pipelines, and API integrations.",
      tab: "Integrations",
      color: "#0ea5e9",
    },
    {
      icon: Key,
      title: "Profile & Account",
      description: "Your personal profile, notifications, and preferences.",
      tab: "Profile",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "#f4f6f9" }}>

      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-xl font-semibold text-[#0f172a] mb-1">Settings</h1>
        <p className="text-[16px] text-[#94a3b8]">Configure hospitals, procedures, permissions, and your account.</p>
      </div>

      {/* Sub-tabs */}
      <div className="px-8">
        <div className="flex items-center gap-1 border-b border-[#dde3ed]">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-[16px] font-medium transition-colors relative"
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
      <div className={activeTab === "Integrations" ? "flex-1 overflow-hidden" : "flex-1 px-8 pt-6 overflow-y-auto"}>
        {activeTab === "Integrations" ? (
          <div className="h-full">
            <ConnectorsSection />
          </div>
        ) : activeTab === "Hospitals" ? (
          loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white border border-[#dde3ed] animate-pulse" />
              ))}
            </div>
          ) : hospitals.length > 0 ? (
            <div className="space-y-3 max-w-2xl">
              {hospitals.map(h => (
                <div key={h.id} className="bg-white border border-[#dde3ed] rounded-xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#eff6ff" }}>
                    <Building2 className="w-5 h-5" style={{ color: "#0ea5e9" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold text-[#0f172a]">{h.name ?? "Hospital"}</div>
                    <div className="text-[16px] text-[#94a3b8]">{h.trustName ?? ""} {h.address ? `· ${h.address}` : ""}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[16px] font-medium`}
                    style={{
                      background: h.isActive !== false ? "#f0fdf4" : "#fef2f2",
                      color: h.isActive !== false ? "#22c55e" : "#ef4444"
                    }}>
                    {h.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* No hospital docs — show the quick-config cards instead */
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              {settingsGroups.map(g => (
                <button key={g.title} onClick={() => setActiveTab(g.tab)}
                  className="bg-white border border-[#dde3ed] rounded-xl p-5 text-left hover:border-[#0ea5e9] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${g.color}18` }}>
                    <g.icon className="w-5 h-5" style={{ color: g.color }} />
                  </div>
                  <div className="text-[16px] font-semibold text-[#0f172a] mb-1">{g.title}</div>
                  <div className="text-[16px] text-[#94a3b8] leading-relaxed">{g.description}</div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-[16px] text-[#94a3b8]">{activeTab} coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
