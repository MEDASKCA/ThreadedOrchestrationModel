"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
  collaborationThreads,
  seedMessages,
  threadParticipants,
  type Thread,
  type Message,
} from "@/lib/collaboration";

function formatRelative(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.max(0, now.getTime() - date.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NAV_GROUPS = [
  {
    label: "Forum",
    items: [
      { key: "forum_all_threads", label: "All Threads" },
      { key: "forum_by_topic", label: "By Topic" },
      { key: "forum_trending", label: "Trending" },
      { key: "forum_pinned", label: "Pinned / Announcements" },
    ],
  },
  {
    label: "Deliverables",
    items: [
      { key: "deliverables_my", label: "My Deliverables" },
      { key: "deliverables_team", label: "Team Deliverables" },
      { key: "deliverables_at_risk", label: "At Risk" },
      { key: "deliverables_overdue", label: "Overdue" },
    ],
  },
  {
    label: "Escalations",
    items: [
      { key: "escalations_active", label: "Active" },
      { key: "escalations_breaches", label: "Breaches" },
      { key: "escalations_critical", label: "Critical" },
    ],
  },
  {
    label: "My Work",
    items: [
      { key: "my_assigned", label: "Assigned to Me" },
      { key: "my_awaiting", label: "Awaiting My Response" },
    ],
  },
  {
    label: "Huddle & Briefing",
    items: [
      { key: "brief_today", label: "Today" },
      { key: "brief_7day", label: "7-Day Forward" },
      { key: "brief_risks", label: "Auto-Risks" },
    ],
  },
  {
    label: "Governance Log",
    items: [
      { key: "governance_activity", label: "Activity Feed" },
      { key: "governance_audit", label: "Audit Log" },
    ],
  },
];

export default function CollaborationSection() {
  const [viewMode, setViewMode] = useState<"board" | "thread">("board");
  const [activeThreadId, setActiveThreadId] = useState<string>(collaborationThreads[0]?.id || "");
  const [activeNav, setActiveNav] = useState("forum_all_threads");

  const threads = collaborationThreads;
  const messages = seedMessages;

  const activeThread = useMemo<Thread | undefined>(
    () => threads.find((t) => t.id === activeThreadId) || threads[0],
    [threads, activeThreadId]
  );

  const activeMessages = useMemo<Message[]>(
    () => messages.filter((m) => m.threadId === activeThread?.id),
    [messages, activeThread]
  );

  const activeNavLabel = useMemo(() => {
    for (const group of NAV_GROUPS) {
      const match = group.items.find((item) => item.key === activeNav);
      if (match) return match.label;
    }
    return "All Threads";
  }, [activeNav]);

  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#f4f6f9" }}>
      <div className="flex flex-1 min-h-0">
        <aside
          style={{
            width: 260,
            flexShrink: 0,
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            paddingBottom: 60,
          }}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div
                style={{
                  padding: "12px 14px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#94a3b8",
                }}
              >
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {group.label}
                </span>
              </div>
              {group.items.map((item) => {
                const isActive = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveNav(item.key)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "7px 14px 7px 24px",
                      background: isActive ? "#f0f9ff" : "transparent",
                      color: isActive ? "#0ea5e9" : "#475569",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 14,
                      border: "none",
                      cursor: "pointer",
                      borderLeft: isActive ? "3px solid #0ea5e9" : "3px solid transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <div className="flex-1 min-h-0 flex flex-col">
          <div
            style={{
              padding: "11px 20px",
              background: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
              backgroundImage:
                "linear-gradient(90deg, rgba(14,165,233,0.55) 0%, rgba(14,165,233,0.0) 70%)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", padding: "2px 0" }}>
                {activeNavLabel}
              </span>
            </div>
            <div style={{ flex: 1 }} />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            {viewMode === "board" && (
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 2, background: "#ffffff" }}>
                <div
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                    Forum Threads
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        borderRadius: 4,
                        fontSize: 12,
                        color: "#475569",
                      }}
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        borderRadius: 4,
                        fontSize: 12,
                        color: "#475569",
                      }}
                    >
                      Forum Tools
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm" style={{ color: "#0f172a", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#e2e8f0", borderBottom: "1px solid #cbd5e1" }}>
                    <tr>
                      <th style={{ width: 36, padding: "8px 6px" }} />
                      <th style={{ padding: "8px 10px", fontSize: 12, color: "#475569", textAlign: "left" }}>
                        Title / Thread Starter
                      </th>
                      <th style={{ padding: "8px 10px", fontSize: 12, color: "#475569", textAlign: "center", width: 140 }}>
                        Replies / Views
                      </th>
                      <th style={{ padding: "8px 10px", fontSize: 12, color: "#475569", textAlign: "right", width: 200 }}>
                        Last Post
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {threads.map((thread, index) => {
                      const threadMessages = messages.filter((msg) => msg.threadId === thread.id);
                      const replyCount = Math.max(0, threadMessages.length - 1);
                      const lastMsg = threadMessages[threadMessages.length - 1];
                      const lastAuthor = threadParticipants[lastMsg?.senderId || "system"]?.name || "System";
                      const views = 120 + replyCount * 7;
                      const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
                      return (
                        <tr
                          key={thread.id}
                          style={{
                            background: rowBg,
                            cursor: "pointer",
                            borderBottom: "1px solid #e2e8f0",
                            height: 56,
                          }}
                          onClick={() => {
                            setActiveThreadId(thread.id);
                            setViewMode("thread");
                          }}
                        >
                          <td style={{ padding: "6px", textAlign: "center", verticalAlign: "middle" }}>
                            <FileText size={16} color="#94a3b8" />
                          </td>
                          <td style={{ padding: "8px 10px", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{thread.title}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              Started by {threadParticipants[thread.ownerId]?.name || thread.ownerId} · {formatRelative(thread.createdAt)}
                            </div>
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: 600 }}>{replyCount} replies</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{views} views</div>
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: 600 }}>{lastAuthor}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              {formatRelative(lastMsg?.createdAt || thread.updatedAt)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {threads.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: "16px 10px", textAlign: "center", color: "#94a3b8" }}>
                          No threads found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === "thread" && activeThread && (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <button
            onClick={() => setViewMode("board")}
            style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 999, padding: "4px 10px", fontSize: 12, color: "#475569" }}
          >
            Back to threads
          </button>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{activeThread.title}</div>
            <div className="mt-1 text-sm text-[#64748b]">{activeThread.status.replace("_", " ")} - Owner: {activeThread.ownerId}</div>
            <div className="mt-6 space-y-3">
              {activeMessages.map((msg) => (
                <div key={msg.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-medium text-[#0f172a]">
                    {threadParticipants[msg.senderId]?.name || msg.senderId}
                    <span className="ml-2 text-xs text-[#94a3b8]">{formatRelative(msg.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-sm text-[#334155]">{msg.body}</div>
                </div>
              ))}
              {activeMessages.length === 0 && (
                <div className="text-sm text-[#94a3b8]">No updates yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
