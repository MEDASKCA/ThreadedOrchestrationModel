"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, MessageSquare, Clock, ChevronRight } from "lucide-react";
import { ChatMessage } from "@/components/ChatPanel";

type HistoryItem = {
  id: string;
  title: string;
  messages: ChatMessage[];
  date: Date;
};

export default function SearchSection({
  messages,
  chatHistory,
  onRestoreChat,
}: {
  messages: ChatMessage[];
  chatHistory: HistoryItem[];
  onRestoreChat: (messages: ChatMessage[]) => void;
}) {
  const [q, setQ] = useState("");

  // Include current session if it has messages
  const allChats: HistoryItem[] = useMemo(() => {
    const current: HistoryItem[] = messages.length > 0
      ? [{
          id: "current",
          title: messages.find(m => m.role === "user")?.content.slice(0, 60) ?? "Current chat",
          messages,
          date: new Date(),
        }]
      : [];
    return [...current, ...chatHistory];
  }, [messages, chatHistory]);

  const filtered = useMemo(() => {
    if (!q.trim()) return allChats;
    const lower = q.toLowerCase();
    return allChats.filter(chat =>
      chat.title.toLowerCase().includes(lower) ||
      chat.messages.some(m => m.content.toLowerCase().includes(lower))
    );
  }, [allChats, q]);

  // Group by date label
  const grouped = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};
    filtered.forEach(chat => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - chat.date.getTime()) / (1000 * 60 * 60 * 24));
      const label = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : diff < 7 ? "This week" : "Older";
      if (!groups[label]) groups[label] = [];
      groups[label].push(chat);
    });
    return groups;
  }, [filtered]);

  const groupOrder = ["Today", "Yesterday", "This week", "Older"];

  function getPreview(chat: HistoryItem) {
    if (q.trim()) {
      // Show the matching message
      const match = chat.messages.find(m => m.content.toLowerCase().includes(q.toLowerCase()));
      if (match) {
        const idx = match.content.toLowerCase().indexOf(q.toLowerCase());
        const start = Math.max(0, idx - 30);
        const snippet = (start > 0 ? "…" : "") + match.content.slice(start, idx + 60) + (idx + 60 < match.content.length ? "…" : "");
        return snippet;
      }
    }
    const last = [...chat.messages].reverse().find(m => m.role === "assistant");
    return last ? last.content.slice(0, 80) + (last.content.length > 80 ? "…" : "") : "";
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#f4f6f9" }}>

      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-xl font-semibold text-[#0f172a] mb-1">Search</h1>
        <p className="text-sm text-[#94a3b8]">Find anything across your chat history with TOM.</p>
      </div>

      {/* Search bar */}
      <div className="px-8 pb-5">
        <div className="flex items-center gap-2 bg-white border border-[#dde3ed] rounded-xl px-4 py-2.5 shadow-sm max-w-xl">
          <Search className="w-4 h-4 text-[#94a3b8] shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 text-sm text-[#0f172a] outline-none bg-transparent placeholder:text-[#94a3b8]"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-xs text-[#94a3b8] hover:text-[#0f172a]">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-8 overflow-y-auto">
        {allChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <MessageSquare className="w-8 h-8 text-[#dde3ed]" />
            <p className="text-sm text-[#94a3b8]">No chat history yet. Start a conversation with TOM.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#94a3b8] mt-2">No chats match "{q}".</p>
        ) : (
          <div className="space-y-6 max-w-xl">
            {groupOrder.filter(g => grouped[g]?.length).map(groupLabel => (
              <div key={groupLabel}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3 h-3 text-[#94a3b8]" />
                  <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">{groupLabel}</span>
                </div>
                <div className="space-y-1">
                  {grouped[groupLabel].map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => onRestoreChat(chat.messages)}
                      className="w-full flex items-start gap-3 bg-white border border-[#dde3ed] rounded-xl px-4 py-3 text-left hover:border-[#0ea5e9] transition-colors group"
                    >
                      <MessageSquare className="w-4 h-4 text-[#94a3b8] shrink-0 mt-0.5 group-hover:text-[#0ea5e9] transition-colors" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[#0f172a] truncate">{chat.title}</span>
                          <span className="text-xs text-[#94a3b8] shrink-0">{format(chat.date, "HH:mm")}</span>
                        </div>
                        {getPreview(chat) && (
                          <p className="text-xs text-[#94a3b8] mt-0.5 line-clamp-1">{getPreview(chat)}</p>
                        )}
                        <p className="text-xs text-[#cbd5e1] mt-0.5">{chat.messages.length} messages</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#dde3ed] shrink-0 mt-0.5 group-hover:text-[#0ea5e9] transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
