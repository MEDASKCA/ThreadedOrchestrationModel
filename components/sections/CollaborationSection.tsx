"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ThumbsUp, ThumbsDown, Pencil } from "lucide-react";
import {
  collaborationThreads,
  seedMessages,
  threadParticipants,
  appendAuditEvent,
  type Thread,
  type Message,
} from "@/lib/collaboration";
import { formatActorDisplayName } from "@/lib/display";

function formatUkDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatUkDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDueWithRemaining(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = startOfDue.getTime() - startOfToday.getTime();
  const days = Math.round(diffMs / 86400000);
  if (days >= 0) {
    return `${formatUkDate(iso)} (${days} days left)`;
  }
  const overdueDays = Math.abs(days);
  return `${formatUkDate(iso)} (${overdueDays} days overdue)`;
}

function formatRefDate(iso: string) {
  const date = new Date(iso);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

function formatDeliverableRef(source: string, iso: string) {
  const category = "OPS";
  return `${category}-${source}-${formatRefDate(iso)}`;
}

function formatForumRef(source: string, iso: string) {
  const category = "OPS";
  return `${category}-${source}-${formatRefDate(iso)}`;
}

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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type ReadingPaneMode = "split_right" | "full_page";

const FORUM_READING_PANE_KEY = "forumReadingPaneMode";

export function resolveReadingPaneMode(
  stored: string | null,
  isNarrow: boolean
): ReadingPaneMode {
  if (isNarrow) return "full_page";
  if (stored === "split_right" || stored === "full_page") {
    return stored;
  }
  return "split_right";
}

export function getForumRouteState(pathname: string | null) {
  if (!pathname) {
    return {
      basePath: "/collaboration/forum",
      navKey: "forum_all_threads",
      threadId: null as string | null,
    };
  }
  const match = pathname.match(/\/thread\/([^/]+)$/);
  const threadId = match ? match[1] : null;
  let basePath = threadId ? pathname.replace(/\/thread\/[^/]+$/, "") : pathname;
  if (basePath.endsWith("/")) basePath = basePath.slice(0, -1);

  let navKey = "forum_all_threads";
  if (basePath.startsWith("/collaboration/forum/trending")) {
    navKey = "forum_trending";
  } else if (basePath.startsWith("/collaboration/forum/pinned")) {
    navKey = "forum_pinned";
  } else if (basePath.startsWith("/collaboration/forum/topics")) {
    navKey = "forum_by_topic";
  } else if (!basePath.startsWith("/collaboration/forum")) {
    basePath = "/collaboration/forum";
    navKey = "forum_all_threads";
  }

  return { basePath, navKey, threadId };
}

export function getThreadListPagerMeta(
  totalCount: number,
  pageSize: number,
  currentPage: number,
  currentPageItemsCount: number
) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(Math.max(currentPage, 1), pageCount);
  const start = totalCount === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(start + currentPageItemsCount - 1, totalCount);
  return { pageCount, currentPage: clampedPage, start, end };
}

function getPageNumbers(currentPage: number, pageCount: number) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const windowSize = 3;
  const start = Math.max(1, Math.min(currentPage - 1, pageCount - (windowSize - 1)));
  return Array.from({ length: windowSize }, (_, i) => start + i);
}

const NAV_GROUPS = [
  {
    label: "Forum",
    items: [
      { key: "forum_all_threads", label: "All Threads" },
      { key: "forum_by_topic", label: "By Category" },
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

type CollaborationSectionProps = {
  initialToolsOpen?: boolean;
  initialSearchOpen?: boolean;
  initialActiveModal?: "acks" | "views" | null;
  initialPathname?: string;
  initialReadingMode?: ReadingPaneMode;
  initialIsNarrow?: boolean;
  hideNav?: boolean;
  initialView?: string;
  deepLink?: { view?: string } | null;
};

export default function CollaborationSection({
  initialToolsOpen = false,
  initialSearchOpen = false,
  initialActiveModal = null,
  initialPathname,
  initialReadingMode,
  initialIsNarrow,
  hideNav,
  initialView,
  deepLink,
}: CollaborationSectionProps) {
  const [activeNav, setActiveNav] = useState(deepLink?.view ?? initialView ?? "forum_all_threads");

  // Sync activeNav when parent drives navigation via deepLink (new object reference = always fires)
  useEffect(() => {
    if (deepLink?.view) setActiveNav(deepLink.view);
  }, [deepLink]);

  // Fallback sync from initialView string
  useEffect(() => {
    if (!deepLink && initialView) setActiveNav(initialView);
  }, [deepLink, initialView]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isForumToolsOpen, setIsForumToolsOpen] = useState(initialToolsOpen);
  const [isThreadToolsOpen, setIsThreadToolsOpen] = useState(false);
  const toolsButtonRef = useRef<HTMLButtonElement | null>(null);
  const threadToolsButtonRef = useRef<HTMLButtonElement | null>(null);
  const toolsPanelRef = useRef<HTMLDivElement | null>(null);
  const threadToolsPanelRef = useRef<HTMLDivElement | null>(null);
  const engagementRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const deliverablePopoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [threads, setThreads] = useState<Thread[]>(() =>
    collaborationThreads.map((thread) => ({
      ...thread,
      viewCount: thread.viewCount ?? 0,
      watchersCount: thread.watchersCount ?? 0,
      likesCount: thread.likesCount ?? 0,
      acknowledgesCount: thread.acknowledgesCount ?? 0,
    }))
  );
  const [threadMessages, setThreadMessages] = useState<Message[]>(seedMessages);
  const [likesByThread, setLikesByThread] = useState<Record<string, Set<string>>>({});
  const [dislikesByThread, setDislikesByThread] = useState<Record<string, Set<string>>>({});
  const [acksByThread, setAcksByThread] = useState<Record<string, Set<string>>>({});
  const [watchersByThread, setWatchersByThread] = useState<Record<string, Set<string>>>({});
  const [participantsByThread, setParticipantsByThread] = useState<Record<string, Set<string>>>({});
  const [activeModal, setActiveModal] = useState<"acks" | "views" | null>(
    initialActiveModal
  );
  const [activePopoverLeft, setActivePopoverLeft] = useState<number | null>(null);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [readingMode, setReadingMode] = useState<ReadingPaneMode>(
    initialReadingMode ?? "split_right"
  );
  const [isNarrow, setIsNarrow] = useState<boolean>(initialIsNarrow ?? false);
  const [currentPath, setCurrentPath] = useState<string>(
    initialPathname ??
      (typeof window !== "undefined" ? window.location.pathname : "/collaboration/forum")
  );

  const currentUserId = "user-001";

  const currentUserName = formatActorDisplayName({
    id: currentUserId,
    name: threadParticipants[currentUserId]?.name,
  });

  const [deliverableFormOpen, setDeliverableFormOpen] = useState(false);
  const [deliverableDraft, setDeliverableDraft] = useState({
    title: "",
    instruction: "",
    assignee: currentUserName,
    status: "Open",
    priority: "Medium",
    dueDate: "",
    risk: false,
    escalated: false,
  });
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({
    title: "",
    instruction: "",
    assignee: "",
    status: "Open",
    priority: "Medium",
    dueDate: "",
    risk: false,
    escalated: false,
  });
  const [deliverablePopoverId, setDeliverablePopoverId] = useState<string | null>(null);
  const [deliverablePopoverLeft, setDeliverablePopoverLeft] = useState<number | null>(null);
  const [deliverablePopoverTop, setDeliverablePopoverTop] = useState<number | null>(null);
  const [deliverableFilters, setDeliverableFilters] = useState({
    owner: "All",
    status: "All",
    priority: "All",
  });

  const resolveAssigneeId = (name: string) =>
    name.trim().toLowerCase() === currentUserName.trim().toLowerCase()
      ? currentUserId
      : `user-${name.trim().toLowerCase().replace(/\s+/g, "-")}`;


  const routeState = useMemo(() => getForumRouteState(currentPath), [currentPath]);
  const isForumRoute = currentPath.startsWith("/collaboration/forum");
  const activeForumNavKey = activeNav.startsWith("forum_")
    ? isForumRoute
      ? routeState.navKey
      : activeNav
    : activeNav;
  const selectedThread = useMemo(
    () => (routeState.threadId ? threads.find((t) => t.id === routeState.threadId) : null),
    [routeState.threadId, threads]
  );

  const activeMessages = useMemo<Message[]>(
    () => threadMessages.filter((m) => m.threadId === selectedThread?.id),
    [threadMessages, selectedThread]
  );

  const activeNavInfo = useMemo(() => {
    for (const group of NAV_GROUPS) {
      const match = group.items.find((item) => item.key === activeForumNavKey);
      if (match) return { groupLabel: group.label, itemLabel: match.label };
    }
    return { groupLabel: null, itemLabel: "All Threads" };
  }, [activeForumNavKey]);
  const activeNavLabel = activeNavInfo.itemLabel;

  const forumThreads = useMemo(() => {
    const base = [...threads];
    if (activeForumNavKey === "forum_pinned") {
      return base.filter((thread) => thread.isPinned);
    }
    if (activeForumNavKey === "forum_trending") {
      return base.sort((a, b) => {
        const aReplies = threadMessages.filter((msg) => msg.threadId === a.id).length;
        const bReplies = threadMessages.filter((msg) => msg.threadId === b.id).length;
        const aScore = aReplies * 2 + (a.viewCount ?? 0);
        const bScore = bReplies * 2 + (b.viewCount ?? 0);
        if (aScore !== bScore) return bScore - aScore;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }
    if (activeForumNavKey === "forum_by_topic") {
      return base.sort((a, b) => {
        const topicA = a.topic ?? "";
        const topicB = b.topic ?? "";
        if (topicA === topicB) return a.title.localeCompare(b.title);
        return topicA.localeCompare(topicB);
      });
    }
    return base;
  }, [activeForumNavKey, threads, threadMessages]);

  const [deliverables, setDeliverables] = useState(() => [
      {
        id: "del-001",
        title: "Backlog triage for CT reporting",
        assigneeId: "user-001",
        assignee: "T. Okafor",
        status: "In progress",
        priority: "High",
        dueDate: "2026-02-26T12:00:00Z",
        updatedAt: "2026-02-20T09:15:00Z",
        risk: true,
        escalated: true,
        instruction: "Coordinate with radiology leads to clear the CT backlog and publish a daily triage note.",
      },
      {
        id: "del-002",
        title: "Roster gap cover for weekend shift",
        assigneeId: "user-002",
        assignee: "A. Patel",
        status: "Blocked",
        priority: "Urgent",
        dueDate: "2026-02-21T16:00:00Z",
        updatedAt: "2026-02-19T14:20:00Z",
        risk: true,
        escalated: false,
        instruction: "Confirm weekend cover and update rota with contingency contacts.",
      },
      {
        id: "del-003",
        title: "Clinic overbooked follow-ups",
        assigneeId: "user-003",
        assignee: "S. Fraser",
        status: "Open",
        priority: "Medium",
        dueDate: "2026-03-04T10:00:00Z",
        updatedAt: "2026-02-18T11:00:00Z",
        risk: false,
        escalated: false,
        instruction: "Review follow-up demand and propose capped overbook slots for the next 2 weeks.",
      },
      {
        id: "del-004",
        title: "Radiology turnaround improvement plan",
        assigneeId: "user-001",
        assignee: "T. Okafor",
        status: "Review",
        priority: "Low",
        dueDate: "2026-03-01T09:00:00Z",
        updatedAt: "2026-02-17T08:30:00Z",
        risk: false,
        escalated: false,
        instruction: "Draft improvement plan and circulate for sign-off.",
      },
      {
        id: "del-005",
        title: "Escalation SLA audit",
        assigneeId: "user-004",
        assignee: "R. Singh",
        status: "In progress",
        priority: "High",
        dueDate: "2026-02-22T12:00:00Z",
        updatedAt: "2026-02-21T07:40:00Z",
        risk: true,
        escalated: true,
        instruction: "Compile SLA breach evidence and update the governance log.",
      },
    ]);

  const deliverableRows = useMemo(() => {
    const now = new Date();
    if (activeForumNavKey === "deliverables_my") {
      return deliverables.filter((item) => item.assigneeId === currentUserId);
    }
    if (activeForumNavKey === "deliverables_at_risk") {
      return deliverables.filter((item) => item.risk);
    }
    if (activeForumNavKey === "deliverables_overdue") {
      return deliverables.filter((item) => new Date(item.dueDate) < now);
    }
    const priorityRank = (priority: string) => {
      switch (priority) {
        case "Urgent":
          return 0;
        case "High":
          return 1;
        case "Medium":
          return 2;
        default:
          return 3;
      }
    };
    let rows = [...deliverables];
    if (deliverableFilters.owner !== "All") {
      rows = rows.filter((item) => item.assignee === deliverableFilters.owner);
    }
    if (deliverableFilters.status !== "All") {
      rows = rows.filter((item) => item.status === deliverableFilters.status);
    }
    if (deliverableFilters.priority !== "All") {
      rows = rows.filter((item) => item.priority === deliverableFilters.priority);
    }
    return rows.sort((a, b) => {
      const dueA = new Date(a.dueDate).getTime();
      const dueB = new Date(b.dueDate).getTime();
      const overdueA = dueA < now.getTime();
      const overdueB = dueB < now.getTime();
      if (overdueA && overdueB) {
        return dueA - dueB;
      }
      if (overdueA) return -1;
      if (overdueB) return 1;
      if (dueA !== dueB) return dueA - dueB;
      const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [activeForumNavKey, deliverables, currentUserId, deliverableFilters]);


  const effectiveReadingMode: ReadingPaneMode = resolveReadingPaneMode(readingMode, isNarrow);
  const isForumView = activeForumNavKey.startsWith("forum_");

  const navigateTo = (path: string) => {
    if (typeof window !== "undefined") {
      if (window.location.pathname !== path) {
        window.history.pushState({}, "", path);
      }
    }
    setCurrentPath(path);
  };

  const getThreadStatus = (thread: Thread) => {
    const isEscalated = thread.status === "escalated";
    const isSlaRisk = thread.status === "at_risk";
    const isBlocked = thread.status === "blocked";
    const isInProgress = thread.status === "in_progress";
    const isResolved = thread.status === "resolved";

    if (isEscalated) return { label: "Escalated", tone: "escalated" };
    if (isSlaRisk) return { label: "At risk", tone: "risk" };
    if (isBlocked) return { label: "Blocked", tone: "blocked" };
    if (isInProgress) return { label: "In progress", tone: "progress" };
    if (isResolved) return { label: "Resolved", tone: "resolved" };
    return { label: "Open", tone: "open" };
  };

  const getThreadSource = (thread: Thread) => {
    const inferred =
      thread.source ??
      (thread.provenance && thread.provenance.length > 0 ? "external" : undefined) ??
      (thread.ownerId === "system" ? "tom" : undefined) ??
      "unknown";

    switch (inferred) {
      case "thread":
        return { label: "Thread", hint: "Origin: promoted from a private thread" };
      case "forum":
        return { label: "Direct", hint: "Origin: created directly in the Forum" };
      case "huddle":
        return { label: "Huddle", hint: "Origin: raised during huddle/briefing" };
      case "tom":
        return { label: "TOM", hint: "Origin: generated by TOM" };
      case "external":
        return { label: "External", hint: "Origin: imported from an integrated system" };
      default:
        return { label: "—", hint: "Origin: unknown" };
    }
  };

  const canModerate = useMemo(() => {
    if (!selectedThread) return false;
    const role = threadParticipants[currentUserId]?.role ?? "";
    return selectedThread.ownerId === currentUserId || role === "Service Delivery";
  }, [selectedThread, currentUserId]);

  const participants = selectedThread ? participantsByThread[selectedThread.id] ?? new Set<string>() : new Set<string>();
  const likes = selectedThread ? likesByThread[selectedThread.id] ?? new Set<string>() : new Set<string>();
  const dislikes = selectedThread ? dislikesByThread[selectedThread.id] ?? new Set<string>() : new Set<string>();
  const replyCount = selectedThread ? Math.max(0, activeMessages.length - 1) : 0;
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const watchers = selectedThread ? watchersByThread[selectedThread.id] ?? new Set<string>() : new Set<string>();

  const toggleReaction = (direction: "up" | "down") => {
    if (!selectedThread) return;
    if (direction === "up") {
      setLikesByThread((prev) => {
        const next = new Set(prev[selectedThread.id] ?? []);
        const isLiked = next.has(currentUserId);
        if (isLiked) next.delete(currentUserId);
        else next.add(currentUserId);
        setDislikesByThread((prevDislikes) => {
          const nextDislikes = new Set(prevDislikes[selectedThread.id] ?? []);
          if (!isLiked && nextDislikes.has(currentUserId)) {
            nextDislikes.delete(currentUserId);
          }
          return { ...prevDislikes, [selectedThread.id]: nextDislikes };
        });
        appendAuditEvent({
          id: crypto.randomUUID(),
          threadId: selectedThread.id,
          eventType: isLiked ? "unliked" : "liked",
          actorId: currentUserId,
          sourceSystem: "USER",
          observedAt: new Date().toISOString(),
          recordedAt: new Date().toISOString(),
          payload: { reaction: "up" },
        });
        return { ...prev, [selectedThread.id]: next };
      });
      return;
    }
    setDislikesByThread((prev) => {
      const next = new Set(prev[selectedThread.id] ?? []);
      const isDisliked = next.has(currentUserId);
      if (isDisliked) next.delete(currentUserId);
      else next.add(currentUserId);
      setLikesByThread((prevLikes) => {
        const nextLikes = new Set(prevLikes[selectedThread.id] ?? []);
        if (!isDisliked && nextLikes.has(currentUserId)) {
          nextLikes.delete(currentUserId);
        }
        return { ...prevLikes, [selectedThread.id]: nextLikes };
      });
      appendAuditEvent({
        id: crypto.randomUUID(),
        threadId: selectedThread.id,
        eventType: isDisliked ? "unliked" : "liked",
        actorId: currentUserId,
        sourceSystem: "USER",
        observedAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        payload: { reaction: "down" },
      });
      return { ...prev, [selectedThread.id]: next };
    });
  };

  const toggleAck = () => {
    if (!selectedThread) return;
    setAcksByThread((prev) => {
      const next = new Set(prev[selectedThread.id] ?? []);
      const isAcked = next.has(currentUserId);
      if (isAcked) next.delete(currentUserId);
      else next.add(currentUserId);
      appendAuditEvent({
        id: crypto.randomUUID(),
        threadId: selectedThread.id,
        eventType: isAcked ? "unacknowledged" : "acknowledged",
        actorId: currentUserId,
        sourceSystem: "USER",
        observedAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        payload: {},
      });
      setThreads((threadsPrev) =>
        threadsPrev.map((thread) =>
          thread.id === selectedThread.id
            ? { ...thread, acknowledgesCount: Math.max(0, (thread.acknowledgesCount ?? 0) + (isAcked ? -1 : 1)) }
            : thread
        )
      );
      return { ...prev, [selectedThread.id]: next };
    });
  };

  const toggleWatch = () => {
    if (!selectedThread) return;
    setWatchersByThread((prev) => {
      const next = new Set(prev[selectedThread.id] ?? []);
      const isWatching = next.has(currentUserId);
      if (isWatching) next.delete(currentUserId);
      else next.add(currentUserId);
      appendAuditEvent({
        id: crypto.randomUUID(),
        threadId: selectedThread.id,
        eventType: isWatching ? "unwatch" : "watch",
        actorId: currentUserId,
        sourceSystem: "USER",
        observedAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        payload: {},
      });
      setThreads((threadsPrev) =>
        threadsPrev.map((thread) =>
          thread.id === selectedThread.id
            ? { ...thread, watchersCount: Math.max(0, (thread.watchersCount ?? 0) + (isWatching ? -1 : 1)) }
            : thread
        )
      );
      return { ...prev, [selectedThread.id]: next };
    });
  };

  const addPost = (body: string) => {
    if (!selectedThread || selectedThread.isLocked) return;
    const post: Message = {
      id: crypto.randomUUID(),
      threadId: selectedThread.id,
      senderId: currentUserId,
      body,
      createdAt: new Date().toISOString(),
      sourceSystem: "USER",
    };
    setThreadMessages((prev) => [...prev, post]);
    setParticipantsByThread((prev) => {
      const next = new Set(prev[selectedThread.id] ?? []);
      next.add(currentUserId);
      return { ...prev, [selectedThread.id]: next };
    });
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThread.id
          ? { ...thread, updatedAt: post.createdAt, lastMessage: post.body }
          : thread
      )
    );
    appendAuditEvent({
      id: crypto.randomUUID(),
      threadId: selectedThread.id,
      eventType: "post_added",
      actorId: currentUserId,
      sourceSystem: "USER",
      observedAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      payload: {},
    });
  };

  const togglePin = () => {
    if (!selectedThread) return;
    const nextValue = !selectedThread.isPinned;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThread.id ? { ...thread, isPinned: nextValue } : thread
      )
    );
    appendAuditEvent({
      id: crypto.randomUUID(),
      threadId: selectedThread.id,
      eventType: nextValue ? "pinned" : "unpinned",
      actorId: currentUserId,
      sourceSystem: "USER",
      observedAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      payload: {},
    });
  };

  const toggleLock = () => {
    if (!selectedThread) return;
    const nextValue = !selectedThread.isLocked;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThread.id ? { ...thread, isLocked: nextValue } : thread
      )
    );
    appendAuditEvent({
      id: crypto.randomUUID(),
      threadId: selectedThread.id,
      eventType: nextValue ? "locked" : "unlocked",
      actorId: currentUserId,
      sourceSystem: "USER",
      observedAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      payload: {},
    });
  };

  const markResolved = () => {
    if (!selectedThread) return;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThread.id ? { ...thread, status: "resolved" } : thread
      )
    );
    appendAuditEvent({
      id: crypto.randomUUID(),
      threadId: selectedThread.id,
      eventType: "resolved",
      actorId: currentUserId,
      sourceSystem: "USER",
      observedAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      payload: {},
    });
  };

  const submitEscalation = () => {
    if (!selectedThread || !escalationReason.trim()) return;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThread.id ? { ...thread, status: "escalated" } : thread
      )
    );
    appendAuditEvent({
      id: crypto.randomUUID(),
      threadId: selectedThread.id,
      eventType: "escalated",
      actorId: currentUserId,
      sourceSystem: "USER",
      observedAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      payload: { reason: escalationReason },
    });
    setEscalationReason("");
    setEscalationOpen(false);
  };

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        (toolsPanelRef.current && toolsPanelRef.current.contains(target)) ||
        (toolsButtonRef.current && toolsButtonRef.current.contains(target)) ||
        (threadToolsPanelRef.current && threadToolsPanelRef.current.contains(target)) ||
        (threadToolsButtonRef.current && threadToolsButtonRef.current.contains(target)) ||
        (popoverRef.current && popoverRef.current.contains(target)) ||
        (deliverablePopoverRef.current && deliverablePopoverRef.current.contains(target))
      ) {
        return;
      }
      if (isForumToolsOpen) {
        setIsForumToolsOpen(false);
        toolsButtonRef.current?.focus();
      }
      if (isThreadToolsOpen) {
        setIsThreadToolsOpen(false);
        threadToolsButtonRef.current?.focus();
      }
      if (activeModal) {
        setActiveModal(null);
        setActivePopoverLeft(null);
      }
      if (deliverablePopoverId) {
        setDeliverablePopoverId(null);
        setDeliverablePopoverLeft(null);
        setDeliverablePopoverTop(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isForumToolsOpen, isThreadToolsOpen, activeModal, deliverablePopoverId]);

  useEffect(() => {
    if (isForumToolsOpen) {
      const firstItem = toolsPanelRef.current?.querySelector<HTMLButtonElement>("[data-menu-item]");
      firstItem?.focus();
    }
  }, [isForumToolsOpen]);

  useEffect(() => {
    if (isThreadToolsOpen) {
      const firstItem =
        threadToolsPanelRef.current?.querySelector<HTMLButtonElement>("[data-thread-menu-item]");
      firstItem?.focus();
    }
  }, [isThreadToolsOpen]);

  useEffect(() => {
    if (initialIsNarrow !== undefined || typeof window === "undefined") return;
    const update = () => setIsNarrow(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [initialIsNarrow]);

  useEffect(() => {
    if (initialReadingMode !== undefined || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(FORUM_READING_PANE_KEY);
    setReadingMode(resolveReadingPaneMode(stored, false));
  }, [initialReadingMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePop = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    const initialParticipants: Record<string, Set<string>> = {};
    const initialLikes: Record<string, Set<string>> = {};
    const initialAcks: Record<string, Set<string>> = {};
    const initialWatchers: Record<string, Set<string>> = {};

    for (const thread of threads) {
      initialParticipants[thread.id] = new Set([thread.ownerId, ...thread.participantIds]);
      initialLikes[thread.id] = new Set();
      initialAcks[thread.id] = new Set();
      initialWatchers[thread.id] = new Set(thread.watcherIds ?? []);
    }
    for (const msg of threadMessages) {
      if (!initialParticipants[msg.threadId]) {
        initialParticipants[msg.threadId] = new Set();
      }
      initialParticipants[msg.threadId].add(msg.senderId);
    }
    setParticipantsByThread(initialParticipants);
    setLikesByThread(initialLikes);
    setAcksByThread(initialAcks);
    setWatchersByThread(initialWatchers);
  }, []);

  useEffect(() => {
    if (!selectedThread) return;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThread.id
          ? { ...thread, viewCount: (thread.viewCount ?? 0) + 1 }
          : thread
      )
    );
  }, [selectedThread?.id]);

  const listBasePath = routeState.basePath;

  const handleThreadSelect = (id: string) => {
    navigateTo(`${listBasePath}/thread/${id}`);
  };

  const handleClosePane = () => {
    navigateTo(listBasePath);
  };

  const openEngagementPopover = (
    type: "views",
    event: React.MouseEvent<HTMLElement>
  ) => {
    event.preventDefault();
    const container = engagementRef.current;
    const target = event.currentTarget as HTMLElement;
    if (!container) {
      setActiveModal(type);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const popoverWidth = 240;
    let left = targetRect.left - containerRect.left;
    left = Math.max(8, Math.min(left, containerRect.width - popoverWidth - 8));
    setActivePopoverLeft(left);
    setActiveModal(type);
  };

  
  
  const handleAddDeliverable = () => {
    const title = deliverableDraft.title.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const due = deliverableDraft.dueDate ? new Date(deliverableDraft.dueDate).toISOString() : now;
    const assigneeName = deliverableDraft.assignee.trim() || currentUserName;
    const entry = {
      id: `del-${crypto.randomUUID()}`,
      title,
      instruction: deliverableDraft.instruction.trim(),
      assigneeId: resolveAssigneeId(assigneeName),
      assignee: assigneeName,
      status: deliverableDraft.status,
      priority: deliverableDraft.priority,
      dueDate: due,
      updatedAt: now,
      risk: deliverableDraft.risk,
      escalated: deliverableDraft.escalated,
    };
    setDeliverables((prev) => [entry, ...prev]);
    setDeliverableDraft({
      title: "",
      instruction: "",
      assignee: currentUserName,
      status: "Open",
      priority: "Medium",
      dueDate: "",
      risk: false,
      escalated: false,
    });
    setDeliverableFormOpen(false);
  };

  const handleStartEditDeliverable = (item: typeof deliverables[number]) => {
    setEditingDeliverableId(item.id);
    setEditingDraft({
      title: item.title,
      instruction: item.instruction ?? "",
      assignee: item.assignee,
      status: item.status,
      priority: item.priority,
      dueDate: item.dueDate.slice(0, 10),
      risk: item.risk,
      escalated: item.escalated ?? false,
    });
  };

  const handleSaveDeliverable = () => {
    if (!editingDeliverableId) return;
    const title = editingDraft.title.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const assigneeName = editingDraft.assignee.trim() || currentUserName;
    setDeliverables((prev) =>
      prev.map((item) =>
        item.id === editingDeliverableId
          ? {
              ...item,
              title,
              assignee: assigneeName,
              assigneeId: resolveAssigneeId(assigneeName),
              status: editingDraft.status,
              priority: editingDraft.priority,
              dueDate: editingDraft.dueDate ? new Date(editingDraft.dueDate).toISOString() : item.dueDate,
              risk: editingDraft.risk,
              escalated: editingDraft.escalated ?? false,
              updatedAt: now,
            }
          : item
      )
    );
    setEditingDeliverableId(null);
  };

  const handleDeleteDeliverable = (id: string) => {
    setDeliverables((prev) => prev.filter((item) => item.id != id));
  };

  const toggleDeliverableEscalated = (id: string) => {
    setDeliverables((prev) =>
      prev.map((item) => (item.id === id ? { ...item, escalated: !item.escalated } : item))
    );
  };

  const renderDeliverables = () => (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ height: "100%", width: "100%", position: "relative" }}>
      <div
        style={{
          border: "1px solid #c9d2dc",
          borderRadius: 0,
          background: "#ffffff",
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid #c9d2dc",
            background: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>Deliverables</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, color: "#64748b" }}>{deliverableRows.length} items</div>
            <label style={{ fontSize: 16, color: "#64748b" }}>
              Owner
              <select
                value={deliverableFilters.owner}
                onChange={(event) => setDeliverableFilters((prev) => ({ ...prev, owner: event.target.value }))}
                style={{ marginLeft: 6, border: "1px solid #cbd5e1", borderRadius: 6, padding: "3px 6px", fontSize: 16, color: "#334155" }}
              >
                <option>All</option>
                {Array.from(new Set(deliverables.map((item) => item.assignee))).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 16, color: "#64748b" }}>
              Status
              <select
                value={deliverableFilters.status}
                onChange={(event) => setDeliverableFilters((prev) => ({ ...prev, status: event.target.value }))}
                style={{ marginLeft: 6, border: "1px solid #cbd5e1", borderRadius: 6, padding: "3px 6px", fontSize: 16, color: "#334155" }}
              >
                <option>All</option>
                {Array.from(new Set(deliverables.map((item) => item.status))).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 16, color: "#64748b" }}>
              Priority
              <select
                value={deliverableFilters.priority}
                onChange={(event) => setDeliverableFilters((prev) => ({ ...prev, priority: event.target.value }))}
                style={{ marginLeft: 6, border: "1px solid #cbd5e1", borderRadius: 6, padding: "3px 6px", fontSize: 16, color: "#334155" }}
              >
                <option>All</option>
                {Array.from(new Set(deliverables.map((item) => item.priority))).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setDeliverableFormOpen((open) => !open)}
              style={{
                border: "1px solid #0ea5e9",
                background: "#0ea5e9",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 16,
                color: "#ffffff",
              }}
            >
              {deliverableFormOpen ? "Close" : "Add"}
            </button>
          </div>
        </div>
        {deliverableFormOpen && (
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", gap: 8 }}>
              <input
                value={deliverableDraft.title}
                placeholder="Deliverable title"
                onChange={(event) => setDeliverableDraft((prev) => ({ ...prev, title: event.target.value }))}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
              />
              <input
                value={deliverableDraft.assignee}
                placeholder="Assignee"
                onChange={(event) => setDeliverableDraft((prev) => ({ ...prev, assignee: event.target.value }))}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
              />
              <select
                value={deliverableDraft.status}
                onChange={(event) => setDeliverableDraft((prev) => ({ ...prev, status: event.target.value }))}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
              >
                <option>Open</option>
                <option>In progress</option>
                <option>Blocked</option>
                <option>Review</option>
                <option>Resolved</option>
              </select>
              <select
                value={deliverableDraft.priority}
                onChange={(event) => setDeliverableDraft((prev) => ({ ...prev, priority: event.target.value }))}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
              <input
                type="date"
                value={deliverableDraft.dueDate}
                onChange={(event) => setDeliverableDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <label style={{ fontSize: 16, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={deliverableDraft.risk}
                    onChange={(event) => setDeliverableDraft((prev) => ({ ...prev, risk: event.target.checked }))}
                  />
                  At risk
                </label>
                <label style={{ fontSize: 16, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={deliverableDraft.escalated}
                    onChange={(event) => setDeliverableDraft((prev) => ({ ...prev, escalated: event.target.checked }))}
                  />
                  Escalated
                </label>
              </div>
              <button
                type="button"
                onClick={handleAddDeliverable}
                style={{
                  border: "1px solid #0ea5e9",
                  background: "#0ea5e9",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: 16,
                  color: "#ffffff",
                }}
              >
                Create
              </button>
            </div>
          </div>
        )}
        
        {deliverablePopoverId && (
          <div
            ref={deliverablePopoverRef}
            style={{
              position: "absolute",
              top: deliverablePopoverTop ?? 86,
              left: deliverablePopoverLeft ?? 12,
              width: 260,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "10px 12px",
              boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
              zIndex: 30,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Instruction</div>
            <div style={{ fontSize: 16, color: "#475569" }}>
              {deliverableRows.find((row) => row.id === deliverablePopoverId)?.instruction ?? "No instructions provided."}
            </div>
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16, color: "#0f172a" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 80 }}>
                Ref
              </th>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 280 }}>
                Task
              </th>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 90 }}>
                Assignee
              </th>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 130 }}>
                Status
              </th>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 120 }}>
                Priority
              </th>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 150 }}>
                Due
              </th>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 150 }}>
                Updated
              </th>
              <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", width: 130 }}>
                Actions / Escalated
              </th>
            </tr>
          </thead>
          <tbody>
            
            {deliverableRows.map((item, index) => (
              <tr
                key={item.id}
                style={{
                  background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <td
                  style={{ padding: "8px 10px", borderRight: "1px solid #e2e8f0", width: 80, color: "#64748b", fontWeight: 600 }}
                >
                  {formatDeliverableRef("DEL", item.dueDate)}
                </td>
                <td
                  style={{ padding: "8px 10px", borderRight: "1px solid #e2e8f0", width: 280 }}
                >
                  {editingDeliverableId === item.id ? (
                    <>
                      <input
                        value={editingDraft.title}
                        onChange={(event) => setEditingDraft((prev) => ({ ...prev, title: event.target.value }))}
                        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16, width: "100%" }}
                      />
                      <textarea
                        value={editingDraft.instruction}
                        onChange={(event) => setEditingDraft((prev) => ({ ...prev, instruction: event.target.value }))}
                        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16, width: "100%", marginTop: 6 }}
                      />
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", flex: 1 }}>{item.title}</div>
                        {item.instruction && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              const target = event.currentTarget as HTMLElement;
                              const container = target.closest('td');
                              if (!container) return;
                              const containerRect = container.getBoundingClientRect();
                              const targetRect = target.getBoundingClientRect();
                              const popoverWidth = 260;
                              let left = targetRect.left - containerRect.left;
                              left = Math.max(8, Math.min(left, containerRect.width - popoverWidth - 8));
                              const top = targetRect.bottom - containerRect.top + 6;
                              setDeliverablePopoverLeft(left);
                              setDeliverablePopoverTop(top);
                              setDeliverablePopoverId((prev) => (prev === item.id ? null : item.id));
                            }}
                            title="View instructions"
                            style={{
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                              color: "#0ea5e9",
                              fontSize: 16,
                              cursor: "pointer",
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                            }}
                          >
                            i
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </td>
                <td style={{ padding: "8px 10px", color: "#334155", borderRight: "1px solid #e2e8f0" }}>
                  {editingDeliverableId === item.id ? (
                    <input
                      value={editingDraft.assignee}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, assignee: event.target.value }))}
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16, width: "100%" }}
                    />
                  ) : (
                    <div
                      title={item.assignee}
                      aria-label={item.assignee}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#e2e8f0",
                        color: "#475569",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(item.assignee)}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    fontWeight: 600,
                    color:
                      item.status === "Blocked"
                        ? "#1f2937"
                        : item.status === "Review"
                        ? "#8b5e34"
                        : item.status === "In progress"
                        ? "#1e3a8a"
                        : "#a16207",
                    background:
                      item.status === "Blocked"
                        ? "#e5e7eb"
                        : item.status === "Review"
                        ? "#f3e7d3"
                        : item.status === "In progress"
                        ? "#dbeafe"
                        : "#fef9c3",
                    borderRight: "1px solid #e2e8f0",
                  }}
                >
                  {editingDeliverableId === item.id ? (
                    <select
                      value={editingDraft.status}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, status: event.target.value }))}
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
                    >
                      <option>Open</option>
                      <option>In progress</option>
                      <option>Blocked</option>
                      <option>Review</option>
                      <option>Resolved</option>
                    </select>
                  ) : (
                    item.status
                  )}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    color:
                      item.priority === "Urgent"
                        ? "#9f1239"
                        : item.priority === "High"
                        ? "#5b21b6"
                        : item.priority === "Medium"
                        ? "#155e75"
                        : "#166534",
                    background:
                      item.priority === "Urgent"
                        ? "#ffe4e6"
                        : item.priority === "High"
                        ? "#ede9fe"
                        : item.priority === "Medium"
                        ? "#cffafe"
                        : "#dcfce7",
                    borderRight: "1px solid #e2e8f0",
                  }}
                >
                  {editingDeliverableId === item.id ? (
                    <select
                      value={editingDraft.priority}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, priority: event.target.value }))}
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  ) : (
                    item.priority
                  )}
                </td>
                <td style={{ padding: "8px 10px", color: "#475569", borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
                  {editingDeliverableId === item.id ? (
                    <input
                      type="date"
                      value={editingDraft.dueDate}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 16 }}
                    />
                  ) : (
                    formatDueWithRemaining(item.dueDate)
                  )}
                </td>
                <td style={{ padding: "8px 10px", color: "#94a3b8", borderRight: "1px solid #e2e8f0" }}>
                  {formatUkDate(item.updatedAt)}
                </td>
                <td style={{ padding: "8px 10px", width: 130 }}>
                  {editingDeliverableId === item.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleSaveDeliverable}
                        style={{ border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#ffffff", borderRadius: 6, padding: "4px 10px", fontSize: 16, cursor: "pointer" }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDeliverableId(null)}
                        style={{ border: "1px solid #e2e8f0", background: "#ffffff", color: "#475569", borderRadius: 6, padding: "4px 10px", fontSize: 16, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, color: "#475569" }}>
                        <input
                          type="checkbox"
                          checked={editingDraft.escalated}
                          onChange={(event) => setEditingDraft((prev) => ({ ...prev, escalated: event.target.checked }))}
                        />
                        Escalated
                      </label>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleStartEditDeliverable(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleStartEditDeliverable(item);
                          }
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#0ea5e9", fontSize: 16, cursor: "pointer" }}
                      >
                        <Pencil size={14} />
                        Edit
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.escalated}
                        onClick={() => toggleDeliverableEscalated(item.id)}
                        style={{
                          width: 36,
                          height: 20,
                          borderRadius: 999,
                          border: "1px solid #cbd5e1",
                          background: item.escalated ? "#0ea5e9" : "#e2e8f0",
                          position: "relative",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        title={item.escalated ? "Escalated" : "Not escalated"}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: item.escalated ? 18 : 2,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: "#ffffff",
                            transition: "left 0.15s ease",
                          }}
                        />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {deliverableRows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "14px 10px", textAlign: "center", color: "#94a3b8" }}>
                  No deliverables found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

const renderThreadList = () => (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ height: "100%", width: "100%", position: "relative" }}>
      <div
        style={{
          border: "1px solid #c9d2dc",
          borderRadius: 0,
          background: "#ffffff",
          position: "relative",
          isolation: "isolate",
          width: "100%",
          height: "100%",
        }}
      >
        {(() => {
          const pageSizeOptions = [10, 20, 50];
          const stickyOffset = 40;
          const totalCount = forumThreads.length;
          const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
          const safePage = Math.min(Math.max(currentPage, 1), pageCount);
          const startIndex = (safePage - 1) * pageSize;
          const pageItems = forumThreads.slice(startIndex, startIndex + pageSize);
          const meta = getThreadListPagerMeta(totalCount, pageSize, safePage, pageItems.length);
          const pageNumbers = getPageNumbers(meta.currentPage, meta.pageCount);
          const pagerBar = (
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1000,
                background: "#94a3b8",
                backgroundClip: "padding-box",
                padding: "6px 10px",
                minHeight: stickyOffset,
                boxSizing: "border-box",
                borderBottom: "1px solid #c9d2dc",
                boxShadow: "0 1px 0 rgba(15,23,42,0.12)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
                  <div style={{ fontSize: 16, color: "#ffffff", fontWeight: 600 }}>
                    Threads {meta.start} to {meta.end} of {totalCount}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label htmlFor="forum-page-size" style={{ fontSize: 16, color: "#ffffff" }}>
                      Show
                    </label>
                    <select
                      id="forum-page-size"
                      value={pageSize}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setPageSize(next);
                        setCurrentPage(1);
                      }}
                      style={{
                        height: 24,
                        border: "1px solid #c9d2dc",
                        background: "#ffffff",
                        borderRadius: 3,
                        fontSize: 16,
                        color: "#334155",
                        padding: "0 6px",
                      }}
                    >
                      {pageSizeOptions.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16, color: "#ffffff" }}>View:</span>
                    <select
                      value={effectiveReadingMode}
                      disabled={isNarrow}
                      onChange={(event) => {
                        const next = event.target.value as ReadingPaneMode;
                        setReadingMode(next);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem(FORUM_READING_PANE_KEY, next);
                        }
                      }}
                      style={{
                        height: 24,
                        border: "1px solid #c9d2dc",
                        background: "#ffffff",
                        borderRadius: 3,
                        fontSize: 16,
                        color: "#334155",
                        padding: "0 6px",
                        opacity: isNarrow ? 0.6 : 1,
                      }}
                    >
                      <option value="split_right">Split Right</option>
                      <option value="full_page">Full Page</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }} />
                  <nav aria-label="Thread list pagination">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 16, color: "#ffffff" }}>
                        Page {meta.currentPage} of {meta.pageCount}
                      </div>
                      {pageNumbers.map((page) => (
                        <button
                          key={page}
                          type="button"
                          aria-label={`Page ${page}`}
                          aria-current={page === meta.currentPage ? "page" : undefined}
                          onClick={() => setCurrentPage(page)}
                          disabled={page === meta.currentPage}
                          style={{
                            padding: "0 8px",
                            height: 24,
                            border: "1px solid #c9d2dc",
                            background: page === meta.currentPage ? "#e2e8f0" : "#ffffff",
                            borderRadius: 3,
                            fontSize: 16,
                            color: "#334155",
                            cursor: page === meta.currentPage ? "default" : "pointer",
                          }}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(meta.pageCount)}
                        aria-label="Last page"
                        disabled={meta.currentPage === meta.pageCount}
                        style={{
                          padding: "0 8px",
                          height: 24,
                          border: "1px solid #c9d2dc",
                          background: meta.currentPage === meta.pageCount ? "#e2e8f0" : "#ffffff",
                          borderRadius: 3,
                          fontSize: 16,
                          color: "#334155",
                          cursor: meta.currentPage === meta.pageCount ? "default" : "pointer",
                        }}
                      >
                        {"Last \u00BB"}
                      </button>
                    </div>
                  </nav>
                  <div style={{ display: "flex", gap: 6, position: "relative", alignItems: "center" }}>
                    <input
                      ref={searchInputRef}
                      placeholder="Search forum..."
                      style={{
                        height: 24,
                        border: "1px solid #c9d2dc",
                        background: "#ffffff",
                        borderRadius: 3,
                        fontSize: 16,
                        color: "#334155",
                        padding: "0 8px",
                        width: 180,
                      }}
                    />
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isForumToolsOpen}
                        onClick={() => setIsForumToolsOpen((prev) => !prev)}
                        ref={toolsButtonRef}
                        style={{
                          padding: "3px 8px",
                          border: "1px solid #c9d2dc",
                          background: "#ffffff",
                          borderRadius: 3,
                          fontSize: 16,
                          color: "#3b4a5a",
                          cursor: "pointer",
                        }}
                      >
                        {"Forum Tools \u25BE"}
                      </button>
                      <div
                        ref={toolsPanelRef}
                        role="menu"
                        aria-label="Forum tools"
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "100%",
                          marginTop: 6,
                          width: 180,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          padding: 6,
                          boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
                          zIndex: 60,
                          display: isForumToolsOpen ? "grid" : "none",
                          gap: 4,
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setIsForumToolsOpen(false);
                            toolsButtonRef.current?.focus();
                          }
                        }}
                      >
                        <button type="button" role="menuitem" data-menu-item disabled style={{ padding: "6px 8px", textAlign: "left", color: "#94a3b8" }}>
                          Mark all read
                        </button>
                        <button type="button" role="menuitem" data-menu-item disabled style={{ padding: "6px 8px", textAlign: "left", color: "#94a3b8" }}>
                          Subscribe
                        </button>
                        <button type="button" role="menuitem" data-menu-item disabled style={{ padding: "6px 8px", textAlign: "left", color: "#94a3b8" }}>
                          Export / Snapshot
                        </button>
                      </div>
                    </div>
                  </div>
            </div>
          );


          return (
            <>
              {pagerBar}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 16,
                  tableLayout: "auto",
                  color: "#0f172a",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                    <th
                      style={{
                        position: "sticky",
                        top: stickyOffset,
                        zIndex: 30,
                        background: "#f1f5f9",
                        backgroundClip: "padding-box",
                        width: 120,
                        padding: "10px 12px",
                        textAlign: "center",
                        fontSize: 16,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                      }}
                    >
                      Ref
                    </th>
                    <th
                      style={{
                        position: "sticky",
                        top: stickyOffset,
                        zIndex: 30,
                        background: "#f1f5f9",
                        backgroundClip: "padding-box",
                        width: 96,
                        padding: "10px 12px",
                        textAlign: "center",
                        fontSize: 16,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                      }}
                    >
                      Source
                    </th>
                    <th
                      style={{
                        position: "sticky",
                        top: stickyOffset,
                        zIndex: 30,
                        background: "#f1f5f9",
                        backgroundClip: "padding-box",
                        width: 90,
                        padding: "10px 12px",
                        textAlign: "center",
                        fontSize: 16,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        position: "sticky",
                        top: stickyOffset,
                        zIndex: 30,
                        background: "#f1f5f9",
                        backgroundClip: "padding-box",
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: 16,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                      }}
                    >
                      Title / Thread Starter
                    </th>
                    <th
                      style={{
                        position: "sticky",
                        top: stickyOffset,
                        zIndex: 30,
                        background: "#f1f5f9",
                        backgroundClip: "padding-box",
                        width: 140,
                        padding: "10px 12px",
                        textAlign: "center",
                        fontSize: 16,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                      }}
                    >
                      Replies / Views
                    </th>
                    <th
                      style={{
                        position: "sticky",
                        top: stickyOffset,
                        zIndex: 30,
                        background: "#f1f5f9",
                        backgroundClip: "padding-box",
                        width: 180,
                        padding: "10px 12px",
                        textAlign: "right",
                        fontSize: 16,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#64748b",
                      }}
                    >
                      Last Post By
                    </th>
                  </tr>
                </thead>
                <tbody style={{ position: "relative", zIndex: 1 }}>
                  {pageItems.map((thread, index) => {
                    const threadMessagesForRow = threadMessages.filter(
                      (msg) => msg.threadId === thread.id
                    );
                    const replyCount = Math.max(0, threadMessagesForRow.length - 1);
                    const lastMsg = threadMessagesForRow[threadMessagesForRow.length - 1];
                    const lastAuthorId = lastMsg?.senderId || "system";
                    const lastAuthor = formatActorDisplayName({
                      id: lastAuthorId,
                      name: threadParticipants[lastAuthorId]?.name,
                    });
                    const status = getThreadStatus(thread);
                    const source = getThreadSource(thread);
                    const views = thread.viewCount ?? 0;
                    const isEven = index % 2 === 0;
                    return (
                      <tr
                        key={thread.id}
                        style={{
                          background: isEven ? "#ffffff" : "#f8fafc",
                          borderBottom: "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          handleThreadSelect(thread.id);
                        }}
                      >
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            borderRight: "1px solid #f1f5f9",
                            fontSize: 16,
                            color: "#475569",
                          }}
                        >
                          {formatForumRef("FOR", thread.createdAt)}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            borderRight: "1px solid #f1f5f9",
                            fontSize: 16,
                            color: "#475569",
                          }}
                          title={source.hint}
                        >
                          {source.label}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            borderRight: "1px solid #f1f5f9",
                            fontSize: 16,
                            fontWeight: 600,
                            color:
                              status.tone === "escalated"
                                ? "#b91c1c"
                                : status.tone === "risk"
                                ? "#b45309"
                                : status.tone === "blocked"
                                ? "#c2410c"
                                : status.tone === "progress"
                                ? "#1d4ed8"
                                : status.tone === "resolved"
                                ? "#15803d"
                                : "#475569",
                          }}
                          aria-label={`Status: ${status.label}`}
                          title={status.label}
                          className={`status-text status-${status.tone}`}
                        >
                          {status.label}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            verticalAlign: "middle",
                            borderRight: "1px solid #f1f5f9",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#1b3b5a" }}>{thread.title}</div>
                          <div style={{ fontSize: 16, color: "#6a7b8c" }}>
                            Started by{" "}
                            {formatActorDisplayName({
                              id: thread.ownerId,
                              name: threadParticipants[thread.ownerId]?.name,
                            })}
                            , {formatUkDateTime(thread.createdAt)}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            borderRight: "1px solid #f1f5f9",
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>Replies: {replyCount}</div>
                          <div style={{ fontSize: 16, color: "#334155" }}>Views: {views}</div>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", verticalAlign: "middle" }}>
                          <div style={{ fontWeight: 600, color: "#1b3b5a" }}>{lastAuthor}</div>
                          <div style={{ fontSize: 16, color: "#6a7b8c" }}>
                            {formatUkDateTime(lastMsg?.createdAt || thread.updatedAt)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "12px 10px", textAlign: "center", color: "#94a3b8" }}>
                        No threads found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          );
        })()}
      </div>
    </div>
  );

  const threadDetailBody = selectedThread ? (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{selectedThread.title}</div>
      <div className="mt-1 text-[16px] text-[#64748b]">
        {selectedThread.status.replace("_", " ")} - Owner:{" "}
        {formatActorDisplayName({
          id: selectedThread.ownerId,
          name: threadParticipants[selectedThread.ownerId]?.name,
        })}
      </div>
      <div ref={engagementRef} className="mt-4 flex flex-wrap items-center gap-6 text-[16px] text-[#475569]" style={{ position: "relative" }}>
        {(() => {
          const linkBase: React.CSSProperties = {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            color: "#0ea5e9",
            cursor: "pointer",
          };
          const onHoverIn = (event: React.MouseEvent<HTMLElement>) => {
            event.currentTarget.style.color = "#0ea5e9";
          };
          const onHoverOut = (event: React.MouseEvent<HTMLElement>) => {
            event.currentTarget.style.color = "#0ea5e9";
          };
          return (
            <>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onMouseEnter={onHoverIn}
                onMouseLeave={onHoverOut}
                style={linkBase}
              >
                <span aria-hidden="true" style={{ display: "inline-flex" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M4 5h16v11H7l-3 3V5z" stroke="#475569" strokeWidth="1.5" />
                  </svg>
                </span>
                <span style={{ fontWeight: 700, color: "#0ea5e9" }}>{formatCompactNumber(replyCount)}</span>
                <span>Comments</span>
              </a>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    toggleReaction("up");
                  }}
                  onMouseEnter={onHoverIn}
                  onMouseLeave={onHoverOut}
                  style={linkBase}
                >
                  <span aria-hidden="true" style={{ display: "inline-flex" }}>
                    <ThumbsUp
                      size={14}
                      color="#0ea5e9"
                      fill={likes.has(currentUserId) ? "#0ea5e9" : "none"}
                      strokeWidth={1.8}
                    />
                  </span>
                  <span style={{ fontWeight: 700, color: "#0ea5e9" }}>
                    {formatCompactNumber(likes.size)}
                  </span>
                </a>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    toggleReaction("down");
                  }}
                  onMouseEnter={onHoverIn}
                  onMouseLeave={onHoverOut}
                  style={linkBase}
                >
                  <span aria-hidden="true" style={{ display: "inline-flex" }}>
                    <ThumbsDown
                      size={14}
                      color="#0ea5e9"
                      fill={dislikes.has(currentUserId) ? "#0ea5e9" : "none"}
                      strokeWidth={1.8}
                    />
                  </span>
                  <span style={{ fontWeight: 700, color: "#0ea5e9" }}>
                    {formatCompactNumber(dislikes.size)}
                  </span>
                </a>
                <span style={{ color: "#0ea5e9" }}>Reactions</span>
              </span>
              <a
                href="#"
                onClick={(event) => openEngagementPopover("views", event)}
                onMouseEnter={onHoverIn}
                onMouseLeave={onHoverOut}
                style={linkBase}
              >
                <span aria-hidden="true" style={{ display: "inline-flex" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="2.5" stroke="#475569" strokeWidth="1.5" />
                  </svg>
                </span>
                <span style={{ fontWeight: 700, color: "#0ea5e9" }}>
                  {formatCompactNumber(selectedThread.viewCount ?? 0)}
                </span>
                <span>Views</span>
              </a>
            </>
          );
        })()}
        {activeModal && activeModal !== "acks" && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={
              "Views"
            }
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: activePopoverLeft ?? 0,
              width: 240,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "10px 12px",
              boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
              zIndex: 40,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#0f172a", fontSize: 16 }}>
              Views
            </div>
            {activeModal === "views" ? (
              <div className="text-[16px] text-[#475569]">
                Total views: {formatCompactNumber(selectedThread?.viewCount ?? 0)}
              </div>
            ) : (
              <div className="text-[16px] text-[#94a3b8]">No entries yet.</div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {canModerate && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              ref={threadToolsButtonRef}
              onClick={() => setIsThreadToolsOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isThreadToolsOpen}
              style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 8, padding: "5px 10px", fontSize: 16 }}
            >
              Thread Tools ▾
            </button>
            {isThreadToolsOpen && (
              <div
                role="menu"
                ref={threadToolsPanelRef}
                style={{
                  position: "absolute",
                  right: 0,
                  marginTop: 6,
                  width: 200,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: 6,
                  padding: 6,
                  boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
                  zIndex: 20,
                  display: "grid",
                  gap: 4,
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsThreadToolsOpen(false);
                    threadToolsButtonRef.current?.focus();
                  }
                }}
              >
                <button type="button" role="menuitem" data-thread-menu-item onClick={togglePin} style={{ padding: "6px 8px", textAlign: "left" }}>
                  {selectedThread.isPinned ? "Unpin" : "Pin"}
                </button>
                <button type="button" role="menuitem" data-thread-menu-item onClick={toggleLock} style={{ padding: "6px 8px", textAlign: "left" }}>
                  {selectedThread.isLocked ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-thread-menu-item
                  onClick={() => setEscalationOpen(true)}
                  style={{ padding: "6px 8px", textAlign: "left" }}
                >
                  Escalate…
                </button>
                <button type="button" role="menuitem" data-thread-menu-item onClick={markResolved} style={{ padding: "6px 8px", textAlign: "left" }}>
                  Mark Resolved
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div ref={commentsRef} className="mt-6">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            Comments {formatCompactNumber(replyCount)}
          </div>
          <button
            type="button"
            style={{
              border: "none",
              background: "transparent",
              color: "#475569",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Sort by ▾
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#e2e8f0",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {getInitials(formatActorDisplayName({ id: currentUserId, name: threadParticipants[currentUserId]?.name }))}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              ref={replyInputRef}
              placeholder={selectedThread.isLocked ? "Thread locked" : "Write a comment..."}
              disabled={selectedThread.isLocked}
              id="thread-reply"
              style={{
                width: "100%",
                minHeight: 72,
                border: "none",
                borderBottom: "1px solid #cbd5e1",
                padding: "6px 0",
                fontSize: 16,
                resize: "vertical",
                background: "transparent",
                outline: "none",
                color: "#0f172a",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                disabled={selectedThread.isLocked}
                onClick={() => {
                  const input = document.getElementById("thread-reply") as HTMLTextAreaElement | null;
                  if (input) input.value = "";
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#475569",
                  fontSize: 16,
                  cursor: selectedThread.isLocked ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedThread.isLocked}
                onClick={() => {
                  const input = document.getElementById("thread-reply") as HTMLTextAreaElement | null;
                  if (!input) return;
                  const text = input.value.trim();
                  if (!text) return;
                  addPost(text);
                  input.value = "";
                }}
                style={{
                  border: "1px solid #0ea5e9",
                  background: selectedThread.isLocked ? "#f1f5f9" : "#0ea5e9",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: 16,
                  color: selectedThread.isLocked ? "#94a3b8" : "#ffffff",
                  cursor: selectedThread.isLocked ? "not-allowed" : "pointer",
                }}
              >
                Comment
              </button>
            </div>
            {selectedThread.isLocked && (
              <div className="mt-2 text-[16px] text-[#94a3b8]">Thread locked</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activeMessages.map((msg) => {
            const authorName = formatActorDisplayName({
              id: msg.senderId,
              name: threadParticipants[msg.senderId]?.name,
            });
            return (
              <div key={msg.id} style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#e2e8f0",
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(authorName)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16 }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{authorName}</span>
                    <span style={{ color: "#94a3b8" }}>{formatRelative(msg.createdAt)}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 16, color: "#0f172a" }}>{msg.body}</div>
                </div>
              </div>
            );
          })}
          {activeMessages.length === 0 && (
            <div className="text-[16px] text-[#94a3b8]">No comments yet.</div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#f4f6f9" }}>
      <div className="flex flex-1 min-h-0">
        {!hideNav && <aside
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
                    fontSize: 16,
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
                const isActive = activeForumNavKey === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key.startsWith("forum_")) {
                        const target =
                          item.key === "forum_trending"
                            ? "/collaboration/forum/trending"
                            : item.key === "forum_pinned"
                            ? "/collaboration/forum/pinned"
                            : item.key === "forum_by_topic"
                            ? "/collaboration/forum/topics"
                            : "/collaboration/forum";
                        navigateTo(target);
                        return;
                      }
                      setActiveNav(item.key);
                    }}
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
                      fontSize: 16,
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
        </aside>}

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
                {activeNavInfo.groupLabel
                  ? <>{activeNavInfo.groupLabel}<span style={{ fontWeight: 700, color: "#0f172a", margin: "0 4px 0 4px" }}>:</span>{activeNavInfo.itemLabel}</>
                  : activeNavInfo.itemLabel}
              </span>
            </div>
            <div style={{ flex: 1 }} />
          </div>

          
          <div className="flex-1 min-h-0 flex">
            {isForumView ? (
              <>
                {effectiveReadingMode === "split_right" && (
                  <>
                    <div style={{ flex: "1 1 65%", minWidth: 560, minHeight: 0 }}>
                      {renderThreadList()}
                    </div>
                    <div style={{ width: 1, background: "#e2e8f0" }} />
                    <div style={{ flex: "1 1 35%", minWidth: 320, minHeight: 0, display: "flex", flexDirection: "column" }}>
                      <div
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#334155" }}>Thread</div>
                        <button
                          type="button"
                          aria-label="Close pane"
                          onClick={handleClosePane}
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 16,
                            lineHeight: 1,
                            color: "#64748b",
                            cursor: "pointer",
                          }}
                        >
                          ?
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
                        {selectedThread ? (
                          threadDetailBody
                        ) : (
                          <div className="text-[16px] text-[#94a3b8]">Select a thread to view details.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {effectiveReadingMode === "full_page" &&
                  (selectedThread ? (
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
                      <button
                        type="button"
                        onClick={handleClosePane}
                        style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 999, padding: "4px 10px", fontSize: 16, color: "#475569" }}
                      >
                        Back to threads
                      </button>
                      {threadDetailBody}
                    </div>
                  ) : (
                    renderThreadList()
                  ))}
              </>
            ) : (
              renderDeliverables()
            )}
          </div>


          {escalationOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
              }}
              onClick={() => setEscalationOpen(false)}
            >
              <div
                style={{ width: 360, background: "#ffffff", borderRadius: 12, padding: 16 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Escalate thread</div>
                <textarea
                  placeholder="Reason for escalation"
                  value={escalationReason}
                  onChange={(event) => setEscalationReason(event.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 80,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 16,
                    resize: "vertical",
                  }}
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEscalationOpen(false)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 16,
                      color: "#475569",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitEscalation}
                    style={{
                      border: "1px solid #ef4444",
                      background: "#fee2e2",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 16,
                      color: "#b91c1c",
                      fontWeight: 600,
                    }}
                  >
                    Escalate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
