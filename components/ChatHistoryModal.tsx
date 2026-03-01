"use client";

import { X, MessageSquare } from "lucide-react";
import type { ChatThread } from "@/lib/chatHistory";
import type { ChatMessage } from "@/components/ChatPanel";

export default function ChatHistoryModal({
  threads,
  onRestore,
  onClose,
}: {
  threads: ChatThread[];
  onRestore: (messages: ChatMessage[]) => void;
  onClose: () => void;
}) {
  function formatDate(d: Date) {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 560,
          maxHeight: "75vh",
          background: "#ffffff",
          boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <span className="text-[18px] font-semibold text-[#0f172a]">Thread History</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <X className="w-5 h-5 text-[#94a3b8]" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <MessageSquare className="w-10 h-10 text-[#cbd5e1]" />
              <p className="text-[16px] text-[#94a3b8]">No threads saved yet</p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => { onRestore(thread.messages); onClose(); }}
                className="w-full flex items-start gap-4 px-6 py-3.5 text-left transition-colors"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-[#94a3b8]" />
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-medium text-[#0f172a] truncate">{thread.title}</div>
                  <div className="text-[14px] text-[#94a3b8] mt-0.5">
                    {thread.messageCount} message{thread.messageCount !== 1 ? "s" : ""} · {formatDate(thread.createdAt)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
