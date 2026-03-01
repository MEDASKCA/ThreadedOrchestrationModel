"use client";

import {
  useState, useEffect, useRef, useMemo, useCallback,
} from "react";
import {
  Search, Activity, CalendarDays, Users, Sparkles, Settings,
  Plug, MessageSquare, ArrowRight, Clock, Hash, X,
} from "lucide-react";
import { platforms, getPlatformStatus, type Platform } from "@/lib/connectors";
import type { ChatMessage } from "@/components/ChatPanel";

type HistoryItem = {
  id: string;
  title: string;
  messages: ChatMessage[];
  date: Date;
};

type ResultItem = {
  id: string;
  group: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action: () => void;
  accent?: string;
};

const NAV_ITEMS = [
  { key: "connectors",    label: "Integrations",  icon: <Plug className="w-4 h-4" />,         subtitle: "NHS Ecosystem Marketplace" },
  { key: "operations",    label: "Operations",    icon: <Activity className="w-4 h-4" />,      subtitle: "Sessions - Readiness - Waiting List" },
  { key: "planning",      label: "Planning",      icon: <CalendarDays className="w-4 h-4" />,  subtitle: "Roster - Schedule - Workforce" },
  { key: "collaboration", label: "Collaboration", icon: <Users className="w-4 h-4" />,         subtitle: "Messenger - Staff Finder" },
  { key: "intelligence",  label: "Intelligence",  icon: <Sparkles className="w-4 h-4" />,      subtitle: "Analytics - Reports - Audit" },
  { key: "settings",      label: "Settings",      icon: <Settings className="w-4 h-4" />,      subtitle: "Hospitals - Config - Permissions" },
];

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#dbeafe] text-[#1d4ed8] rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function CommandPalette({
  open,
  onClose,
  chatHistory,
  onRestoreChat,
  onNav,
}: {
  open: boolean;
  onClose: () => void;
  chatHistory: HistoryItem[];
  onRestoreChat: (messages: ChatMessage[]) => void;
  onNav: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results: ResultItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items: ResultItem[] = [];

    // Navigation
    const navMatches = q
      ? NAV_ITEMS.filter(n => n.label.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q))
      : NAV_ITEMS;
    navMatches.forEach(n => items.push({
      id: `nav-${n.key}`,
      group: "Navigate",
      icon: <span className="text-[#0ea5e9]">{n.icon}</span>,
      title: n.label,
      subtitle: n.subtitle,
      action: () => { onNav(n.key); onClose(); },
    }));

    // Chats
    const chatMatches = q
      ? chatHistory.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some(m => m.content.toLowerCase().includes(q))
        )
      : chatHistory.slice(0, 5);
    chatMatches.forEach(c => {
      const matchedMsg = q
        ? c.messages.find(m => m.content.toLowerCase().includes(q))
        : undefined;
      const subtitle = matchedMsg
        ? matchedMsg.content.slice(0, 60) + (matchedMsg.content.length > 60 ? "..." : "")
        : `${c.messages.length} messages - ${c.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
      items.push({
        id: `chat-${c.id}`,
        group: "Chats",
        icon: <MessageSquare className="w-4 h-4 text-[#94a3b8]" />,
        title: c.title,
        subtitle,
        action: () => { onRestoreChat(c.messages); onClose(); },
      });
    });

    // NHS Systems
    const connectorMatches: Platform[] = q
      ? platforms.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        ).slice(0, 6)
      : platforms.filter(p => getPlatformStatus(p) === "production").slice(0, 4);
    connectorMatches.forEach(p => {
      const status = getPlatformStatus(p);
      items.push({
        id: `conn-${p.id}`,
        group: "NHS Systems",
        icon: (
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: p.color }}
          >
            {p.initials.slice(0, 3)}
          </div>
        ),
        title: p.name,
        subtitle: status === "production" ? `Production - ${p.category}` : `${status.replace("_", " ")} - ${p.category}`,
        action: () => { onNav("connectors"); onClose(); },
        accent: status === "production" ? "#16a34a" : undefined,
      });
    });

    return items;
  }, [query, chatHistory, onNav, onClose, onRestoreChat]);

  // Group results
  const groups = useMemo(() => {
    const g: Record<string, ResultItem[]> = {};
    results.forEach(r => {
      if (!g[r.group]) g[r.group] = [];
      g[r.group].push(r);
    });
    return g;
  }, [results]);

  const flat = useMemo(() => results, [results]);

  useEffect(() => {
    setFocusedIndex((idx) => Math.min(idx, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape")     { onClose(); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter")      { flat[focusedIndex]?.action(); }
  }, [flat, focusedIndex, onClose]);

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-focused="true"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  if (!open) return null;

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[580px] mx-4 bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{
          boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          maxHeight: "68vh",
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKey}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#f1f5f9]">
          <Search className="w-4 h-4 text-[#94a3b8] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusedIndex(0); }}
            placeholder="Search TOM - sessions, staff, systems, chats..."
            className="flex-1 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none bg-transparent"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="p-1 rounded text-[#94a3b8] hover:text-[#0f172a] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="px-1.5 py-0.5 rounded text-xs text-[#94a3b8] border border-[#e2e8f0] font-mono">Esc</kbd>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {flat.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Hash className="w-6 h-6 text-[#e2e8f0]" />
              <p className="text-sm text-[#94a3b8]">No results for &quot;{query}&quot;</p>
            </div>
          )}
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              <div className="px-4 py-1.5 flex items-center gap-2">
                <Clock className="w-3 h-3 text-[#cbd5e1]" />
                <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">{groupName}</span>
              </div>
              {items.map(item => {
                const idx = globalIndex++;
                const isFocused = idx === focusedIndex;
                return (
                  <button
                    key={item.id}
                    data-focused={isFocused}
                    onClick={item.action}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: isFocused ? "#f1f5f9" : "transparent" }}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#0f172a] font-medium truncate">
                        {highlight(item.title, query)}
                      </div>
                      {item.subtitle && (
                        <div className="text-xs truncate mt-0.5"
                          style={{ color: item.accent ?? "#94a3b8" }}>
                          {highlight(item.subtitle, query)}
                        </div>
                      )}
                    </div>
                    {isFocused && (
                      <ArrowRight className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#f1f5f9] bg-[#fafafa]">
          {[
            { key: "Up/Down", label: "Navigate" },
            { key: "Enter",  label: "Select" },
            { key: "Esc",label: "Close" },
          ].map(k => (
            <div key={k.key} className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded text-xs text-[#64748b] border border-[#e2e8f0] font-mono bg-white">{k.key}</kbd>
              <span className="text-xs text-[#94a3b8]">{k.label}</span>
            </div>
          ))}
          <span className="ml-auto text-xs text-[#cbd5e1]">TOM Search</span>
        </div>
      </div>
    </div>
  );
}
