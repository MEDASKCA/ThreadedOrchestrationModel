"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar, { type HistoryItem } from "@/components/Sidebar";
import ChatPanel, { type ChatMessage } from "@/components/ChatPanel";
import SecondaryNavSidebar from "@/components/SecondaryNavSidebar";
import CommandPalette from "@/components/CommandPalette";
import ChatHistoryModal from "@/components/ChatHistoryModal";
import { saveChatThread, loadChatThreads } from "@/lib/chatHistory";
import { computeProcessingState, type ProcessingState } from "@/lib/processingState";
import type { RichSection } from "@/lib/tom/rich-response";
import dynamic from "next/dynamic";
import { ChevronDown, UserPlus, Bell, PanelLeft, ExternalLink } from "lucide-react";

const OperationsSection = dynamic(() => import("@/components/sections/OperationsSection"), {
  loading: () => <div className="p-6 text-[#94a3b8]">Loading Operations…</div>,
});
const PlanningSection = dynamic(() => import("@/components/sections/PlanningSection"), {
  loading: () => <div className="p-6 text-[#94a3b8]">Loading Planning…</div>,
});
const LogisticsSection = dynamic(() => import("@/components/sections/LogisticsSection"), {
  loading: () => <div className="p-6 text-[#94a3b8]">Loading Logistics…</div>,
});
const CollaborationSection = dynamic(() => import("@/components/sections/CollaborationSection"), {
  loading: () => <div className="p-6 text-[#94a3b8]">Loading Collaboration…</div>,
});
const IntelligenceSection = dynamic(() => import("@/components/sections/IntelligenceSection"), {
  loading: () => <div className="p-6 text-[#94a3b8]">Loading Intelligence…</div>,
});
const SettingsSection = dynamic(() => import("@/components/sections/SettingsSection"), {
  loading: () => <div className="p-6 text-[#94a3b8]">Loading Settings…</div>,
});


const CHAT_DEFAULT_WIDTH = 360;
const CHAT_MIN_WIDTH = 280;
const CHAT_MAX_WIDTH = 600;

function EmbeddedAppFrame({
  title,
  src,
  requestTemplateNameOnLoad = false,
}: {
  title: string;
  src: string;
  requestTemplateNameOnLoad?: boolean;
}) {
  const embedScale = 0.92;

  return (
    <div
      className="h-full w-full min-h-0 rounded-xl overflow-hidden"
      style={{ border: "1px solid #d7e2ef", background: "#ffffff" }}
    >
      <iframe
        title={title}
        src={src}
        onLoad={(event) => {
          if (!requestTemplateNameOnLoad) return;
          event.currentTarget.contentWindow?.postMessage(
            { type: "tomroster:template-name:request" },
            "http://localhost:3000"
          );
        }}
        style={{
          border: 0,
          width: `${100 / embedScale}%`,
          height: `${100 / embedScale}%`,
          transform: `scale(${embedScale})`,
          transformOrigin: "top left",
          display: "block",
        }}
      />
    </div>
  );
}

// ─── SECTION ROUTER ──────────────────────────────────────────────────────────

function SectionContent({
  section,
  messages,
  onSend,
  inputText,
  onInputChange,
  onOpenView,
  onOpenCanvas,
  onPin,
  settingsTab,
  operationsDeepLink,
  logisticsDeepLink,
  collabDeepLink,
  hideNav,
  initialView,
  isSending,
  processingState,
  greetingName,
  greetingSection,
  templateBuilderName,
  onTemplateBuilderNameChange,
  templateBuilderDirty,
  onTemplateBuilderDirtyChange,
}: {
  section: string;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  inputText: string;
  onInputChange: (text: string) => void;
  onOpenView: (deeplink: string) => void;
  onOpenCanvas: (canvas: { title: string; markdown: string; blocks?: RichSection[] }) => void;
  onPin: (pin: { title: string; markdown: string }) => void;
  settingsTab: string | null;
  operationsDeepLink: { view?: string; filters?: Record<string, string> } | null;
  logisticsDeepLink: { view?: string } | null;
  collabDeepLink: { view?: string } | null;
  hideNav?: boolean;
  initialView?: string;
  isSending?: boolean;
  processingState?: import("@/lib/processingState").ProcessingState | null;
  greetingName?: string;
  greetingSection?: string;
  templateBuilderName?: string;
  onTemplateBuilderNameChange?: (name: string) => void;
  templateBuilderDirty?: boolean;
  onTemplateBuilderDirtyChange?: (dirty: boolean) => void;
}) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== "http://localhost:3000" && event.origin !== "http://127.0.0.1:3000") return;
      if (!event.data || typeof event.data !== "object") return;
      const payload = event.data as { type?: unknown; templateName?: unknown; templateDirty?: unknown };
      if (payload.type !== "tomroster:template-name") return;
      const nextName = typeof payload.templateName === "string" && payload.templateName.trim()
        ? payload.templateName.trim()
        : "Untitled Template";
      onTemplateBuilderNameChange?.(nextName);
      onTemplateBuilderDirtyChange?.(Boolean(payload.templateDirty));
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onTemplateBuilderDirtyChange, onTemplateBuilderNameChange]);

  switch (section) {
    case "":
    case "chat":
      return (
        <ChatPanel
          messages={messages}
          onSend={onSend}
          inputText={inputText}
          onInputChange={onInputChange}
          onOpenView={onOpenView}
          onOpenCanvas={onOpenCanvas}
          onPin={onPin}
          isSending={isSending}
          processingState={processingState}
          greetingName={greetingName}
          greetingSection={greetingSection}
        />
      );
    case "operations":
      return <OperationsSection deepLink={operationsDeepLink ?? undefined} hideNav={hideNav} />;
    case "logistics":
      return <LogisticsSection key={logisticsDeepLink?.view ?? initialView ?? "logistics"} deepLink={logisticsDeepLink ?? undefined} hideNav={hideNav} initialView={initialView ?? undefined} />;
    case "planning":
      return <PlanningSection />;
    case "collaboration":
      return <CollaborationSection key={collabDeepLink?.view ?? initialView ?? "collaboration"} deepLink={collabDeepLink ?? undefined} hideNav={hideNav} initialView={initialView ?? undefined} />;
    case "intelligence":
      return <IntelligenceSection />;
    case "configurator":
    case "settings":
      return <SettingsSection initialTab={settingsTab ?? undefined} />;
    case "apps":
      if ((initialView ?? "templateBuilder") === "templateBuilder") {
        return (
          <div className="h-full min-h-0 flex flex-col" style={{ background: "#f4f6f9" }}>
            <div
              style={{
                padding: "11px 20px",
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
                backgroundImage: "linear-gradient(90deg, rgba(14,165,233,0.55) 0%, rgba(14,165,233,0.0) 70%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", padding: "2px 0" }}>
                  Applications: Template Builder
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>-</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    Template: {templateBuilderName || "Untitled Template"}
                  </span>
                  {templateBuilderDirty ? (
                    <span style={{ fontWeight: 700, color: "#b91c1c", marginLeft: 8 }}>(Unsaved)</span>
                  ) : null}
                </span>
              </div>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => window.open("http://localhost:3000", "_blank", "noopener,noreferrer")}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] font-medium"
                style={{ border: "1px solid #d7e2ef", background: "#ffffff", color: "#334155" }}
                aria-label="Open Template Builder in new tab"
              >
                Open in new tab
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="h-full min-h-0 p-0">
              <EmbeddedAppFrame
                title="Template Builder"
                src="http://localhost:3000"
                requestTemplateNameOnLoad={true}
              />
            </div>
          </div>
        );
      }
      return null;
    default:
      return (
        <ChatPanel
          messages={messages}
          onSend={onSend}
          inputText={inputText}
          onInputChange={onInputChange}
          onOpenView={onOpenView}
          onOpenCanvas={onOpenCanvas}
          onPin={onPin}
          isSending={isSending}
          processingState={processingState}
          greetingName={greetingName}
          greetingSection={greetingSection}
        />
      );
  }
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const sidebarWasOpenRef = useRef(true); // remembers state before canvas opened
  const [activeNav, setActiveNav]           = useState("");
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [inputText, setInputText]           = useState("");
  const [chatHistory, setChatHistory]       = useState<HistoryItem[]>([]);
  const [paletteOpen, setPaletteOpen]       = useState(false);
  const [settingsTab, setSettingsTab]       = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newThreadPromptOpen, setNewThreadPromptOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastTopic, setLastTopic] = useState<string | null>(null);
  const [operationsDeepLink, setOperationsDeepLink] = useState<{ view?: string; filters?: Record<string, string> } | null>(null);
  const [logisticsDeepLink, setLogisticsDeepLink] = useState<{ view?: string } | null>(null);
  const [collabDeepLink, setCollabDeepLink] = useState<{ view?: string } | null>(null);
  const [secondaryNavSection, setSecondaryNavSection] = useState<string | null>(null);
  const [secondaryNavView, setSecondaryNavView] = useState<string | null>(null);
  const [pendingCanvasOpen, setPendingCanvasOpen] = useState(false);
  const [tomSessionId, setTomSessionId] = useState<string>("");
  const [canvasState, setCanvasState] = useState<{ isOpen: boolean; title: string; markdown: string; blocks?: RichSection[] }>({
    isOpen: false,
    title: "Canvas",
    markdown: "",
    blocks: undefined,
  });
  const [chatWidth, setChatWidth] = useState<number>(CHAT_DEFAULT_WIDTH);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [drawerSection, setDrawerSection] = useState<string | null>(null);
  const [templateBuilderName, setTemplateBuilderName] = useState("Untitled Template");
  const [templateBuilderDirty, setTemplateBuilderDirty] = useState(false);
  const pageContextTimerRef = useRef<number | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(CHAT_DEFAULT_WIDTH);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("tom_canvas_state");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        isOpen?: boolean;
        title?: string;
        markdown?: string;
        blocks?: RichSection[];
      };
      if (typeof parsed.title === "string" && typeof parsed.markdown === "string") {
        setCanvasState({
          isOpen: false, // Always start in ChatGPT mode regardless of last session state
          title: parsed.title,
          markdown: parsed.markdown,
          blocks: Array.isArray(parsed.blocks) ? parsed.blocks : undefined,
        });
      }
    } catch {
      // ignore parse failures
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tom_canvas_state", JSON.stringify(canvasState));
  }, [canvasState]);

  useEffect(() => {
    const raw = window.localStorage.getItem("tom_chat_width");
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= CHAT_MIN_WIDTH && parsed <= CHAT_MAX_WIDTH) {
      setChatWidth(parsed);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tom_chat_width", String(chatWidth));
  }, [chatWidth]);

  // Load chat history from Firestore on mount
  useEffect(() => {
    loadChatThreads().then((threads) => {
      setChatHistory(
        threads.map((t) => ({ id: t.id, title: t.title, messages: t.messages, date: t.createdAt }))
      );
    }).catch(() => { /* Firestore unavailable, stay with empty history */ });
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      // Delta from drag start: moving left increases chat width
      const delta = resizeStartXRef.current - event.clientX;
      const nextWidth = Math.max(CHAT_MIN_WIDTH, Math.min(CHAT_MAX_WIDTH, resizeStartWidthRef.current + delta));
      setChatWidth(nextWidth);
    };
    const onMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const existingCookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("tom_session="))
      ?.split("=")[1];
    const existing = existingCookie || window.localStorage.getItem("tom_session_id");
    const sessionId = existing || crypto.randomUUID();
    setTomSessionId(sessionId);
    window.localStorage.setItem("tom_session_id", sessionId);
    if (!existingCookie) {
      document.cookie = `tom_session=${sessionId}; path=/; max-age=2592000; samesite=lax`;
    }
  }, []);

  useEffect(() => {
    const applyDeepLink = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith("/collaboration")) {
        setActiveNav("collaboration");
      }
      const params = new URLSearchParams(window.location.search);
      const section = params.get("section");
      const view = params.get("view") ?? undefined;
      const filters: Record<string, string> = {};
      const allow = ["specialty", "consultant", "site", "priority", "rtt_status", "stage", "metric", "search"];
      allow.forEach((key) => {
        const val = params.get(key);
        if (val) filters[key] = val;
      });
      if (section === "operations") {
        setActiveNav("operations");
        setOperationsDeepLink({ view, filters });
      }
    };
    applyDeepLink();
    window.addEventListener("popstate", applyDeepLink);
    return () => window.removeEventListener("popstate", applyDeepLink);
  }, []);

  useEffect(() => {
    if (!tomSessionId) return;
    if (pageContextTimerRef.current) {
      window.clearTimeout(pageContextTimerRef.current);
    }
    pageContextTimerRef.current = window.setTimeout(() => {
      const section = activeNav === "" ? "chat" : activeNav === "configurator" ? "settings" : activeNav;
      const view = section === "operations" ? operationsDeepLink?.view : undefined;
      const filters = section === "operations" ? operationsDeepLink?.filters : undefined;
      const deeplink = `${window.location.pathname}${window.location.search}`;
      fetch("/api/tom/page-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: tomSessionId,
          page_context: { section, view, filters, deeplink },
        }),
      }).catch(() => undefined);
    }, 400);

    return () => {
      if (pageContextTimerRef.current) {
        window.clearTimeout(pageContextTimerRef.current);
      }
    };
  }, [activeNav, operationsDeepLink, tomSessionId]);

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Handle next-action button clicks from RichResponseRenderer
  // open_view actions switch to Copilot mode and navigate to the relevant page
  useEffect(() => {
    function onTomAction(e: Event) {
      const action = (e as CustomEvent<any>).detail;
      if (!action) return;
      const payload = action.payload;
      if (action.action_type === "open" && (payload?.type === "open_view" || payload?.deeplink)) {
        const deeplink = payload?.deeplink as string | undefined;
        let section = payload?.section as string | undefined;
        let view = payload?.view as string | undefined;
        // Parse section/view from deeplink if not provided explicitly
        if (deeplink && (!section || !view)) {
          try {
            const url = new URL(deeplink, window.location.origin);
            section = section || url.searchParams.get("section") || url.pathname.replace(/^\//, "").split("/")[0] || undefined;
            view = view || url.searchParams.get("view") || undefined;
          } catch { /* ignore invalid URL */ }
        }
        // Enter Copilot mode
        setSidebarOpen(false);
        setCanvasState(prev => ({ ...prev, isOpen: true }));
        if (section) {
          setSecondaryNavSection(section);
          setActiveNav(section);
          if (view) {
            setSecondaryNavView(view);
            if (section === "operations") setOperationsDeepLink({ view });
          }
        }
      }
    }
    window.addEventListener("tom:action", onTomAction);
    return () => window.removeEventListener("tom:action", onTomAction);
  }, []);

  // Cleanup hover timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const CANVAS_OPEN_RE = /\b(open canvas|show canvas|canvas mode|switch to canvas|enable canvas|canvas view|canvas)\b/i;
  const CANVAS_CLOSE_RE = /\b(close canvas|hide canvas|exit canvas|canvas off)\b/i;
  const CANVAS_CONFIRM_RE = /\b(yes|yeah|yep|sure|ok|okay|go ahead|confirm|switch|open it|do it)\b/i;

  async function handleSend(text: string) {
    // Handle canvas close intent
    if (CANVAS_CLOSE_RE.test(text)) {
      setCanvasState(prev => ({ ...prev, isOpen: false }));
      setCanvasFullscreen(false);
      setSidebarOpen(sidebarWasOpenRef.current);
      setPendingCanvasOpen(false);
      return;
    }

    // If waiting for canvas confirmation
    if (pendingCanvasOpen) {
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
      setMessages(prev => [...prev, userMsg]);
      if (CANVAS_CONFIRM_RE.test(text)) {
        setPendingCanvasOpen(false);
        handleOpenCanvas({
          title: canvasState.title || "Canvas",
          markdown: canvasState.markdown || "",
          blocks: canvasState.blocks,
        });
      } else {
        setPendingCanvasOpen(false);
        const cancelMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "No problem — staying in standard view." };
        setMessages(prev => [...prev, cancelMsg]);
      }
      return;
    }

    // Canvas mentioned — ask for confirmation before switching
    if (CANVAS_OPEN_RE.test(text) && !canvasState.isOpen) {
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
      setMessages(prev => [...prev, userMsg]);
      const confirmMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "Would you like me to switch to **Canvas mode**? This opens the side-by-side Copilot view. Reply **yes** to confirm." };
      setMessages(prev => [...prev, confirmMsg]);
      setPendingCanvasOpen(true);
      return;
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setActiveNav("");
    setProcessingState(computeProcessingState(text));
    setIsSending(true);
    try {
      const res = await fetch("/api/tom/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, lastTopic }),
      });
      const data = await res.json();
      const routingPath = typeof data?.debug_routing_path === "string"
        ? data.debug_routing_path
        : (typeof data?.trace?.route?.routing_path === "string" ? data.trace.route.routing_path : "");
      const noDataEligiblePath = routingPath === "page_context" || routingPath === "view_finder" || routingPath === "explore_mode";
      const hasNoData = !data?.rich || !Array.isArray(data?.rich?.data_used) || data.rich.data_used.length === 0;
      const reply = typeof data?.response === "string" && data.response.trim()
        ? data.response
        : (noDataEligiblePath && hasNoData
          ? "No relevant data found from connected systems for this request."
          : "I could not complete that request right now.");
      if (typeof data?.topic === "string") {
        setLastTopic(data.topic);
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        rich: data?.rich ?? null,
        debug_routing_path: typeof data?.debug_routing_path === "string" ? data.debug_routing_path : undefined,
        trace_routing_path: typeof data?.trace?.route?.routing_path === "string" ? data.trace.route.routing_path : undefined,
        debug_stage: typeof data?.debug_stage === "string" ? data.debug_stage : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I could not complete that request right now.",
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsSending(false);
    }
  }

  const saveCurrentThread = useCallback(async (msgs: ChatMessage[]) => {
    if (msgs.length === 0) return;
    const title = msgs.find(m => m.role === "user")?.content.slice(0, 80) ?? "Chat";
    try {
      const id = await saveChatThread(title, msgs);
      const newItem: HistoryItem = { id, title, messages: msgs, date: new Date() };
      setChatHistory(prev => [newItem, ...prev]);
    } catch {
      // Firestore unavailable — keep in local state only
      const newItem: HistoryItem = { id: crypto.randomUUID(), title, messages: msgs, date: new Date() };
      setChatHistory(prev => [newItem, ...prev]);
    }
  }, []);

  const confirmTemplateLeave = useCallback(() => {
    if (!templateBuilderDirty) return true;
    return window.confirm("You have unsaved changes in Template Builder. Leave without saving?");
  }, [templateBuilderDirty]);

  const handleNav = useCallback((key: string) => {
    if (activeNav === "apps" && key !== "apps" && !confirmTemplateLeave()) return;
    if (key === "new" || key === "chat") {
      saveCurrentThread(messages);
      setMessages([]);
      setInputText("");
      setLastTopic(null);
      setActiveNav("");
    } else if (key === "connectors") {
      setSettingsTab("Integrations");
      setActiveNav("configurator");
    } else if (key === "settings" || key === "configurator") {
      setSettingsTab(null);
      setActiveNav("configurator");
    } else {
      setSettingsTab(null);
      setActiveNav(key);
    }
  }, [activeNav, confirmTemplateLeave, messages, saveCurrentThread]);

  const handleRestoreChat = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
    setLastTopic(null);
    setActiveNav("");
  }, []);

  const handleOpenView = useCallback((deeplink: string) => {
    if (!deeplink) return;
    window.history.pushState({}, "", deeplink);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const handleOpenCanvas = useCallback((canvas: { title: string; markdown: string; blocks?: RichSection[] }) => {
    const title = String(canvas.title || "").trim();
    const markdown = String(canvas.markdown || "").trim();
    const blocks = Array.isArray(canvas.blocks) ? canvas.blocks : undefined;
    if (!title && !markdown) {
      setCanvasState((prev) => ({ ...prev, isOpen: false }));
      setCanvasFullscreen(false);
      return;
    }
    setCanvasFullscreen(false);
    setCanvasState({ isOpen: true, title: title || "Canvas", markdown: canvas.markdown || "", blocks });
    // Auto-collapse sidebar for more canvas workspace (like Claude/ChatGPT canvas mode)
    setSidebarOpen((prev) => {
      sidebarWasOpenRef.current = prev;
      return false;
    });
  }, []);

  // In canvas mode, slim rail nav icons open the secondary sidebar
  const handleCanvasNavClick = useCallback((key: string) => {
    if (activeNav === "apps" && key !== "apps" && !confirmTemplateLeave()) return;
    if (key === "chat") {
      // New thread — save current thread, dismiss copilot panel, return to full chat view
      saveCurrentThread(messages);
      setMessages([]);
      setInputText("");
      setLastTopic(null);
      setSecondaryNavSection(null);
      setSecondaryNavView(null);
      setLogisticsDeepLink(null);
      setCollabDeepLink(null);
      setActiveNav("");
      return;
    }
    setSecondaryNavSection(prev => prev === key ? null : key);
    setSecondaryNavView(null);
    // Reset section-specific deep links when switching sections
    setLogisticsDeepLink(null);
    setCollabDeepLink(null);
  }, [activeNav, confirmTemplateLeave, messages, saveCurrentThread]);

  // Hover drawer — open/close with delays for smooth feel
  const handleSectionHover = useCallback((key: string) => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setDrawerSection(key);
      setHoveredSection(key);
    }, 150);
  }, []);

  const handleSectionLeave = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    closeTimerRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 250);
  }, []);

  const handleDrawerEnter = useCallback(() => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  }, []);

  const handleDrawerLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 250);
  }, []);

  // Page selected from hover drawer
  const handleDrawerSelect = useCallback((sectionKey: string, viewKey: string) => {
    if (activeNav === "apps" && sectionKey !== "apps" && !confirmTemplateLeave()) return;
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setHoveredSection(null);
    setSecondaryNavSection(sectionKey);
    setSecondaryNavView(viewKey);
    if (sectionKey === "operations") {
      setActiveNav("operations");
      setOperationsDeepLink({ view: viewKey });
    } else if (sectionKey === "logistics") {
      setActiveNav("logistics");
      setLogisticsDeepLink({ view: viewKey });
    } else if (sectionKey === "collaboration") {
      setActiveNav("collaboration");
      setCollabDeepLink({ view: viewKey });
    } else if (sectionKey) {
      setActiveNav(sectionKey);
    }
  }, [activeNav, confirmTemplateLeave]);

  // Secondary nav item selected — load page in canvas area
  const handleSecondaryNavSelect = useCallback((viewKey: string) => {
    if (activeNav === "apps" && secondaryNavSection !== "apps" && !confirmTemplateLeave()) return;
    setSecondaryNavView(viewKey);
    if (secondaryNavSection === "operations") {
      setActiveNav("operations");
      setOperationsDeepLink({ view: viewKey });
    } else if (secondaryNavSection === "logistics") {
      setActiveNav("logistics");
      setLogisticsDeepLink({ view: viewKey });
    } else if (secondaryNavSection === "collaboration") {
      setActiveNav("collaboration");
      setCollabDeepLink({ view: viewKey });
    } else if (secondaryNavSection) {
      setActiveNav(secondaryNavSection);
    }
  }, [activeNav, confirmTemplateLeave, secondaryNavSection]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!templateBuilderDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [templateBuilderDirty]);

  const handlePin = useCallback((pin: { title: string; markdown: string }) => {
    const key = "tom_pins";
    const prevRaw = window.localStorage.getItem(key);
    const prev = prevRaw ? JSON.parse(prevRaw) as Array<{ title: string; markdown: string; created_at: string }> : [];
    const next = [{ ...pin, created_at: new Date().toISOString() }, ...prev].slice(0, 20);
    window.localStorage.setItem(key, JSON.stringify(next));
  }, []);

  const startResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    resizingRef.current = true;
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = chatWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [chatWidth]);

  const sectionLabel: Record<string, string> = {
    "":             "TOM",
    operations:     "Operations",
    logistics:      "Logistics",
    planning:       "Logistics",
    collaboration:  "Collaboration",
    intelligence:   "Intelligence",
    apps:           "Apps",
    configurator:   "Configurator",
    settings:       "Configurator",
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "#f4f6f9" }}>

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        chatHistory={chatHistory}
        onRestoreChat={(msgs) => { handleRestoreChat(msgs); setPaletteOpen(false); }}
        onNav={(key) => { handleNav(key); setPaletteOpen(false); }}
      />

      {/* Sidebar */}
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40"
              style={{ background: "rgba(15,23,42,0.35)" }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div
            className="fixed inset-y-0 left-0 z-50 transition-transform"
            style={{
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            }}
          >
            <Sidebar
              collapsed={false}
              onToggle={() => setSidebarOpen(false)}
              active={activeNav}
              onNav={(key) => { handleNav(key); setSidebarOpen(false); }}
              onSearch={() => setPaletteOpen(true)}
              chatHistory={chatHistory}
              onRestoreChat={handleRestoreChat}
            />
          </div>
        </>
      ) : (
        <Sidebar
          collapsed={!sidebarOpen}
          onToggle={() => {
            if (sidebarOpen) {
              // Collapsing → enter canvas mode
              sidebarWasOpenRef.current = true;
              setSidebarOpen(false);
              setCanvasState(prev => ({ ...prev, isOpen: true }));
            } else {
              // Expanding → exit canvas mode
              setSidebarOpen(true);
              setCanvasState(prev => ({ ...prev, isOpen: false }));
              setCanvasFullscreen(false);
              setSecondaryNavSection(null);
              setSecondaryNavView(null);
            }
          }}
          active={secondaryNavSection ?? activeNav}
          onNav={!sidebarOpen ? handleCanvasNavClick : handleNav}
          onSearch={() => setPaletteOpen(true)}
          chatHistory={chatHistory}
          onRestoreChat={handleRestoreChat}
          onSectionHover={!sidebarOpen ? handleSectionHover : undefined}
          onSectionLeave={!sidebarOpen ? handleSectionLeave : undefined}
          onViewLogs={() => setHistoryModalOpen(true)}
        />
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar — ChatGPT mode and Copilot mode with no page selected */}
        {(!canvasState.isOpen || !secondaryNavView) && <div
          className="flex items-center justify-between px-4 lg:px-5 py-3 shrink-0"
          style={{ background: "#ffffff", minHeight: 56, borderBottom: "1px solid #dde3ed" }}
        >
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = "#eef2f7")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                title="Open menu"
              >
                <PanelLeft className="w-5 h-5 text-[#94a3b8]" />
              </button>
            )}
            {/* TOM version selector */}
            {!isMobile && (
              <button
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = "#eef2f7")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span className="text-lg font-semibold" style={{ color: "#0ea5e9" }}>TOM</span>
                <span className="text-base font-normal" style={{ color: "#94a3b8" }}>1.0</span>
                <ChevronDown className="w-4 h-4 ml-0.5" style={{ color: "#94a3b8" }} />
              </button>
            )}

            {/* Section breadcrumb */}
            {activeNav && (
              <>
                <span className="text-[#dde3ed] text-base">/</span>
                <span className="text-base text-[#475569] font-medium">{sectionLabel[activeNav]}</span>
              </>
            )}

          </div>

          {/* Right: add people */}
          <div className="flex items-center gap-1" style={{ position: "relative" }}>
            <button
              className="p-2 rounded-full transition-colors"
              style={{ color: "#0ea5e9" }}
              onClick={() => {
                setNewThreadPromptOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#0284c7"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#0ea5e9"; }}
              title="Add people to the thread"
            >
              <UserPlus className="w-6 h-6" />
            </button>
            {newThreadPromptOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 44,
                  top: "calc(100% + 8px)",
                  width: 260,
                  background: "#ffffff",
                  border: "1px solid #dde3ed",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                  zIndex: 50,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                  Start a new thread?
                </div>
                <div style={{ fontSize: 16, color: "#64748b", marginBottom: 10 }}>
                  Would you like to start a thread with other participants?
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNewThreadPromptOpen(false)}
                    style={{
                      border: "1px solid #dde3ed",
                      background: "#ffffff",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 16,
                      color: "#475569",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewThreadPromptOpen(false);
                      handleNav("chat");
                    }}
                    style={{
                      border: "1px solid #0ea5e9",
                      background: "#0ea5e9",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 16,
                      color: "#ffffff",
                    }}
                  >
                    Start thread
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative p-2.5 rounded-full transition-colors ml-1"
              style={{ color: "#0ea5e9" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#eef2f7"; e.currentTarget.style.color = "#0ea5e9"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0ea5e9"; }}
              title="Notifications"
            >
              <Bell className="w-6 h-6" />
              <span
                style={{
                  position: "absolute",
                  top: 1,
                  right: 1,
                  minWidth: 18,
                  height: 18,
                  padding: "0 4px",
                  borderRadius: 999,
                  background: "#0ea5e9",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                3
              </span>
            </button>
            {notificationsOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  width: 320,
                  background: "#ffffff",
                  border: "1px solid #dde3ed",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                  zIndex: 50,
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 16, color: "#94a3b8", fontWeight: 600, padding: "6px 8px" }}>
                  Notifications
                </div>
                {[
                  { id: "n1", title: "Ward 4B escalation update", time: "2 min ago" },
                  { id: "n2", title: "New MS Teams invite", time: "12 min ago" },
                  { id: "n3", title: "Task completed: Capacity notes", time: "1 hr ago" },
                ].map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "8px 8px",
                      borderRadius: 10,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ fontSize: 16, color: "#0f172a", fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: 16, color: "#94a3b8" }}>{item.time}</div>
                  </div>
                ))}
                <button
                  style={{
                    marginTop: 6,
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid #dde3ed",
                    padding: "8px 0",
                    fontSize: 16,
                    color: "#0f172a",
                    background: "#f8fafc",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  View all
                </button>
              </div>
            )}
          </div>
        </div>}

        {/* Section content */}
        <div className="flex flex-1 min-h-0 overflow-hidden" ref={workspaceRef}>

          {canvasState.isOpen && !!secondaryNavView && !isMobile ? (
            <>
              {/* LEFT: TOM 1.0 bar + secondary nav + page — flex-col so bar sits above both */}
              <div className="flex-1 min-h-0 flex flex-col min-w-0">

                {/* TOM 1.0 bar — spans secondary nav + page only */}
                <div
                  className="flex items-center gap-2 px-4 py-3 shrink-0"
                  style={{ background: "#ffffff", minHeight: 56, borderBottom: "1px solid #dde3ed" }}
                >
                  <button
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = "#eef2f7")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="text-lg font-semibold" style={{ color: "#0ea5e9" }}>TOM</span>
                    <span className="text-base font-normal" style={{ color: "#94a3b8" }}>1.0</span>
                    <ChevronDown className="w-4 h-4 ml-0.5" style={{ color: "#94a3b8" }} />
                  </button>
                  {activeNav && (
                    <>
                      <span className="text-[#dde3ed] text-base">/</span>
                      <span className="text-base text-[#475569] font-medium">{sectionLabel[activeNav]}</span>
                    </>
                  )}

                </div>

                {/* Page content — secondary nav now lives in hover drawer */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SectionContent
                      section={secondaryNavSection!}
                      messages={messages}
                      onSend={handleSend}
                      inputText={inputText}
                      onInputChange={setInputText}
                      onOpenView={handleOpenView}
                      onOpenCanvas={handleOpenCanvas}
                      onPin={handlePin}
                      settingsTab={secondaryNavSection === "configurator" ? secondaryNavView : settingsTab}
                      operationsDeepLink={secondaryNavSection === "operations" ? operationsDeepLink : null}
                      logisticsDeepLink={secondaryNavSection === "logistics" ? logisticsDeepLink : null}
                      collabDeepLink={secondaryNavSection === "collaboration" ? collabDeepLink : null}
                      hideNav={true}
                      initialView={secondaryNavView ?? undefined}
                      isSending={isSending}
                      processingState={processingState}
                      greetingName="Alexander"
                      greetingSection={secondaryNavSection ?? activeNav}
                      templateBuilderName={templateBuilderName}
                      onTemplateBuilderNameChange={setTemplateBuilderName}
                      templateBuilderDirty={templateBuilderDirty}
                      onTemplateBuilderDirtyChange={setTemplateBuilderDirty}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT: chat — full height, no top bar, independent column */}
              {!canvasFullscreen && (
                <>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    className="w-2 cursor-col-resize shrink-0 bg-slate-100 hover:bg-slate-200 transition-colors"
                    onMouseDown={startResize}
                    title="Resize chat and canvas"
                  />
                  <div
                    className="h-full shrink-0 overflow-hidden flex flex-col"
                    style={{ width: chatWidth, background: "#ffffff", borderLeft: "1px solid #dde3ed" }}
                  >
                    {/* Copilot panel header — UserPlus + Bell */}
                    <div
                      className="flex items-center justify-end gap-1 px-3 shrink-0"
                      style={{ minHeight: 56, borderBottom: "1px solid #dde3ed", position: "relative" }}
                    >
                      <button
                        className="p-2 rounded-full transition-colors"
                        style={{ color: "#0ea5e9" }}
                        onClick={() => {
                          setNewThreadPromptOpen((prev) => !prev);
                          setNotificationsOpen(false);
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#0284c7"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#0ea5e9"; }}
                        title="Add people to the thread"
                      >
                        <UserPlus className="w-6 h-6" />
                      </button>
                      {newThreadPromptOpen && (
                        <div
                          style={{
                            position: "absolute",
                            right: 44,
                            top: "calc(100% + 8px)",
                            width: 260,
                            background: "#ffffff",
                            border: "1px solid #dde3ed",
                            borderRadius: 12,
                            boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                            zIndex: 50,
                            padding: 12,
                          }}
                        >
                          <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                            Start a new thread?
                          </div>
                          <div style={{ fontSize: 16, color: "#64748b", marginBottom: 10 }}>
                            Would you like to start a thread with other participants?
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => setNewThreadPromptOpen(false)}
                              style={{
                                border: "1px solid #dde3ed",
                                background: "#ffffff",
                                borderRadius: 8,
                                padding: "4px 10px",
                                fontSize: 16,
                                color: "#475569",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewThreadPromptOpen(false);
                                handleNav("chat");
                              }}
                              style={{
                                border: "1px solid #0ea5e9",
                                background: "#0ea5e9",
                                borderRadius: 8,
                                padding: "4px 10px",
                                fontSize: 16,
                                color: "#ffffff",
                              }}
                            >
                              Start thread
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setNotificationsOpen((prev) => !prev)}
                        className="relative p-2.5 rounded-full transition-colors ml-1"
                        style={{ color: "#0ea5e9" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#eef2f7"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        title="Notifications"
                      >
                        <Bell className="w-6 h-6" />
                        <span
                          style={{
                            position: "absolute",
                            top: 1,
                            right: 1,
                            minWidth: 18,
                            height: 18,
                            padding: "0 4px",
                            borderRadius: 999,
                            background: "#0ea5e9",
                            color: "#ffffff",
                            fontSize: 11,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          3
                        </span>
                      </button>
                      {notificationsOpen && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "calc(100% + 8px)",
                            width: 320,
                            background: "#ffffff",
                            border: "1px solid #dde3ed",
                            borderRadius: 12,
                            boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                            zIndex: 50,
                            padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 16, color: "#94a3b8", fontWeight: 600, padding: "6px 8px" }}>
                            Notifications
                          </div>
                          {[
                            { id: "n1", title: "Ward 4B escalation update", time: "2 min ago" },
                            { id: "n2", title: "New MS Teams invite", time: "12 min ago" },
                            { id: "n3", title: "Task completed: Capacity notes", time: "1 hr ago" },
                          ].map((item) => (
                            <div
                              key={item.id}
                              style={{ padding: "8px 8px", borderRadius: 10, cursor: "pointer" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                              <div style={{ fontSize: 16, color: "#0f172a", fontWeight: 500 }}>{item.title}</div>
                              <div style={{ fontSize: 16, color: "#94a3b8" }}>{item.time}</div>
                            </div>
                          ))}
                          <button
                            style={{
                              marginTop: 6,
                              width: "100%",
                              borderRadius: 10,
                              border: "1px solid #dde3ed",
                              padding: "8px 0",
                              fontSize: 16,
                              color: "#0f172a",
                              background: "#f8fafc",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            View all
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                      <ChatPanel
                        messages={messages}
                        onSend={handleSend}
                        inputText={inputText}
                        onInputChange={setInputText}
                        onOpenView={handleOpenView}
                        onOpenCanvas={handleOpenCanvas}
                        onPin={handlePin}
                        isCanvasMode={true}
                        isSending={isSending}
                        processingState={processingState}
                        greetingName="Alexander"
                        greetingSection={secondaryNavSection ?? activeNav}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>


              {/* Full-width content — ChatGPT mode or Copilot with no page selected */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <SectionContent
                  section={canvasState.isOpen && secondaryNavSection ? "" : activeNav}
                  messages={messages}
                  onSend={handleSend}
                  inputText={inputText}
                  onInputChange={setInputText}
                  onOpenView={handleOpenView}
                  onOpenCanvas={handleOpenCanvas}
                  onPin={handlePin}
                  settingsTab={settingsTab}
                  operationsDeepLink={operationsDeepLink}
                  logisticsDeepLink={logisticsDeepLink}
                  collabDeepLink={collabDeepLink}
                  isSending={isSending}
                  processingState={processingState}
                  greetingName="Alexander"
                  greetingSection={secondaryNavSection ?? activeNav}
                  templateBuilderName={templateBuilderName}
                  onTemplateBuilderNameChange={setTemplateBuilderName}
                  templateBuilderDirty={templateBuilderDirty}
                  onTemplateBuilderDirtyChange={setTemplateBuilderDirty}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {/* ── Chat history modal ───────────────────────────────────────────── */}
      {historyModalOpen && (
        <ChatHistoryModal
          threads={chatHistory.map(h => ({
            id: h.id,
            title: h.title,
            messages: h.messages,
            createdAt: h.date,
            messageCount: h.messages.length,
          }))}
          onRestore={(msgs) => { handleRestoreChat(msgs); setHistoryModalOpen(false); }}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}

      {/* ── Hover drawer — secondary nav flyout ─────────────────────────── */}
      {!isMobile && drawerSection && (
        <div
          onMouseEnter={handleDrawerEnter}
          onMouseLeave={handleDrawerLeave}
          style={{
            position: "fixed",
            left: 72,
            top: 0,
            bottom: 0,
            width: 224,
            zIndex: 200,
            transform: hoveredSection ? "translateX(0)" : "translateX(-100%)",
            opacity: hoveredSection ? 1 : 0,
            transition: "transform 200ms cubic-bezier(0.4,0,0.2,1), opacity 160ms ease",
            pointerEvents: hoveredSection ? "auto" : "none",
            boxShadow: "6px 0 24px rgba(15,23,42,0.13)",
          }}
        >
          <SecondaryNavSidebar
            sectionKey={drawerSection}
            activeView={secondaryNavView}
            onSelectView={(viewKey) => handleDrawerSelect(drawerSection, viewKey)}
          />
        </div>
      )}

      {isMobile && (
        <button
          style={{
            position: "fixed",
            right: 12,
            bottom: 10,
            fontSize: 12,
            color: "#0ea5e9",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "6px 10px",
            boxShadow: "0 2px 6px rgba(15,23,42,0.08)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          title="TOM version"
        >
          <span style={{ fontWeight: 700 }}>TOM</span>
          <span style={{ color: "#94a3b8" }}>1.0</span>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
        </button>
      )}
    </div>
  );
}

