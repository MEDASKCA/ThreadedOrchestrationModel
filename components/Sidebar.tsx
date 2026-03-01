"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Search,
  Activity,
  Truck,
  Users,
  Sparkles,
  LayoutGrid,
  Sliders,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { ChatMessage } from "@/components/ChatPanel";

export type HistoryItem = {
  id: string;
  title: string;
  messages: ChatMessage[];
  date: Date;
};

const navItems = [
  { key: "operations", label: "Operations", short: "Ops", icon: Activity },
  { key: "logistics", label: "Logistics", short: "Logist", icon: Truck },
  { key: "collaboration", label: "Collaboration", short: "Collab", icon: Users },
  { key: "intelligence", label: "Intelligence", short: "Intel", icon: Sparkles },
  { key: "apps", label: "Apps", short: "Apps", icon: LayoutGrid },
  { key: "configurator", label: "Configurator", short: "Config", icon: Sliders },
];

export default function Sidebar({
  collapsed,
  onToggle,
  active,
  onNav,
  onSearch,
  chatHistory,
  onRestoreChat,
  onSectionHover,
  onSectionLeave,
  onViewLogs,
}: {
  collapsed: boolean;
  onToggle: () => void;
  active: string;
  onNav: (key: string) => void;
  onSearch: () => void;
  chatHistory: HistoryItem[];
  onRestoreChat: (messages: ChatMessage[]) => void;
  onSectionHover?: (key: string) => void;
  onSectionLeave?: () => void;
  onViewLogs?: () => void;
}) {
  if (collapsed) {
    return (
      <aside
        className="w-[72px] shrink-0 flex flex-col h-full items-center py-3 gap-1"
        style={{ background: "#eef2f7", borderRight: "1px solid #dde3ed" }}
      >
        <div className="mb-1 mt-1">
          <Image src="/medaskca-logo.png" alt="MEDASKCA" width={30} height={30} className="rounded-lg" />
        </div>

        <button
          onClick={onToggle}
          title="Expand sidebar"
          className="w-14 py-1.5 rounded-xl flex flex-col items-center gap-1 transition-colors"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#dde3ed"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <PanelLeft className="w-[18px] h-[18px] text-[#94a3b8]" />
        </button>

        <div style={{ height: 1, background: "#dde3ed", width: "48px", margin: "2px 0 4px" }} />

        {/* New thread — collapsed */}
        <button
          onClick={() => onNav("chat")}
          title="New thread"
          className="w-14 py-1.5 rounded-xl flex flex-col items-center gap-1 transition-colors"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#dde3ed"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Image
            src="/newthread1.png"
            width={30}
            height={30}
            alt="New thread"
            style={{ display: "block", mixBlendMode: "multiply" }}
          />
          <span className="font-medium leading-none" style={{ color: "#0ea5e9", fontSize: 16, fontFamily: "Manrope, sans-serif" }}>New Thread</span>
        </button>

        <nav className="flex flex-col items-center gap-1.5 w-full px-1.5">
          {navItems.map(({ key, label, short, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => onNav(key)}
                onMouseEnter={() => onSectionHover?.(key)}
                onMouseLeave={() => onSectionLeave?.()}
                className="w-full flex flex-col items-center gap-1 py-2 rounded-xl text-[16px]"
                style={{ color: isActive ? "#0ea5e9" : "#64748b", background: isActive ? "#ffffff" : "transparent" }}
              >
                <Icon className="w-5 h-5" />
                <span>{short}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-[288px] shrink-0 flex flex-col h-full" style={{ background: "#eef2f7", borderRight: "1px solid #dde3ed" }}>
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <Image src="/medaskca-logo.png" alt="MEDASKCA" width={30} height={30} className="rounded-lg" />
          <div className="text-[18px] font-semibold text-[#0f172a]">MEDASKCA</div>
        </div>
        <button
          onClick={onToggle}
          title="Collapse sidebar"
          className="w-9 h-9 flex items-center justify-center rounded-lg"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#dde3ed"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <PanelLeftClose className="w-4 h-4 text-[#94a3b8]" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => onNav("chat")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[16px]"
          style={{ background: "transparent", color: "#0ea5e9", fontWeight: 500 }}
        >
          <Image
            src="/newthread1.png"
            width={24}
            height={24}
            alt=""
            style={{ display: "block", mixBlendMode: "multiply", flexShrink: 0 }}
          />
          New thread
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[16px]"
          style={{ background: "#ffffff", color: "#475569", border: "1px solid #dde3ed" }}
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      <div style={{ height: 1, background: "#dde3ed", margin: "2px 12px 8px" }} />

      <nav className="flex flex-col gap-0.5 px-3">
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onNav(key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[16px] text-left transition-colors relative"
              style={{
                background: isActive ? "#ffffff" : "transparent",
                color: isActive ? "#0ea5e9" : "#475569",
                fontWeight: isActive ? 500 : 400,
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#dde3ed"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "#0ea5e9" }} />
              )}
              <Icon className="w-5 h-5 shrink-0" style={{ color: isActive ? "#0ea5e9" : "#94a3b8" }} />
              {label}
            </button>
          );
        })}
      </nav>

      <div style={{ height: 1, background: "#dde3ed", margin: "8px 12px 6px" }} />

      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#94a3b8] uppercase tracking-widest">Recent</span>
          {onViewLogs && (
            <button
              onClick={onViewLogs}
              className="text-[13px] font-medium transition-colors"
              style={{ color: "#0ea5e9" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#0284c7"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#0ea5e9"; }}
            >
              View Logs
            </button>
          )}
        </div>
        <div className="mt-1">
          {chatHistory.length === 0 ? (
            <div className="px-2.5 py-2 text-[14px] text-[#94a3b8]">No threads yet</div>
          ) : (
            chatHistory.slice(0, 10).map((item) => (
              <button
                key={item.id}
                onClick={() => onRestoreChat(item.messages)}
                title={item.title}
                className="w-full px-2.5 py-1.5 rounded-lg text-left transition-colors"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#dde3ed"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div className="truncate text-[15px] text-[#0f172a]">{item.title}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid #dde3ed" }}>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#dde3ed")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-[16px] font-semibold" style={{ background: "#64748b" }}>
            A
          </div>
          <div className="leading-tight text-left min-w-0">
            <div className="text-[18px] font-medium text-[#0f172a] truncate">Alexander M.</div>
            <div className="text-[16px] text-[#64748b]">Team Leader</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
