import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CollaborationSection, {
  getThreadListPagerMeta,
  resolveReadingPaneMode,
} from "../components/sections/CollaborationSection";
import { collaborationThreads, threadParticipants } from "../lib/collaboration";

describe("Collaboration forum list columns", () => {
  it("renders source before status and plain text status labels", () => {
    const resolvedThread = {
      id: "thr-test-resolved",
      title: "Resolved thread for status test",
      type: "operational",
      status: "resolved",
      priority: "green",
      source: "forum",
      ownerId: "user-001",
      participantIds: ["user-001"],
      watcherIds: [],
      linkedEntities: {},
      policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
      createdAt: "2026-02-20T10:00:00Z",
      updatedAt: "2026-02-20T10:30:00Z",
      unreadCount: 0,
      lastMessage: "Done.",
      provenance: [],
    } as const;
    const blockedThread = {
      id: "thr-test-blocked",
      title: "Blocked thread for status test",
      type: "operational",
      status: "blocked",
      priority: "green",
      source: "thread",
      ownerId: "user-001",
      participantIds: ["user-001"],
      watcherIds: [],
      linkedEntities: {},
      policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
      createdAt: "2026-02-20T10:00:00Z",
      updatedAt: "2026-02-20T10:30:00Z",
      unreadCount: 0,
      lastMessage: "Blocked.",
      provenance: [],
    } as const;
    const externalThread = {
      id: "thr-test-external",
      title: "External thread for status test",
      type: "operational",
      status: "active",
      priority: "green",
      source: "external",
      ownerId: "system",
      participantIds: ["user-001"],
      watcherIds: [],
      linkedEntities: {},
      policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
      createdAt: "2026-02-20T10:00:00Z",
      updatedAt: "2026-02-20T10:30:00Z",
      unreadCount: 0,
      lastMessage: "Imported.",
      provenance: ["Datix"],
    } as const;
    const tomThread = {
      id: "thr-test-tom",
      title: "TOM thread for status test",
      type: "operational",
      status: "active",
      priority: "green",
      source: "tom",
      ownerId: "system",
      participantIds: ["user-001"],
      watcherIds: [],
      linkedEntities: {},
      policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
      createdAt: "2026-02-20T10:00:00Z",
      updatedAt: "2026-02-20T10:30:00Z",
      unreadCount: 0,
      lastMessage: "Generated.",
      provenance: [],
    } as const;
    const unknownThread = {
      id: "thr-test-unknown",
      title: "Unknown thread for status test",
      type: "operational",
      status: "active",
      priority: "green",
      ownerId: "user-001",
      participantIds: ["user-001"],
      watcherIds: [],
      linkedEntities: {},
      policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
      createdAt: "2026-02-20T10:00:00Z",
      updatedAt: "2026-02-20T10:30:00Z",
      unreadCount: 0,
      lastMessage: "Unknown.",
      provenance: [],
    } as const;

    collaborationThreads.push(
      resolvedThread,
      blockedThread,
      externalThread,
      tomThread,
      unknownThread
    );
    try {
      const html = renderToStaticMarkup(React.createElement(CollaborationSection));
      expect(html.indexOf("Source")).toBeLessThan(html.indexOf("Status"));
      expect(html).toContain("Escalated");
      expect(html).toContain("At risk");
      expect(html).toContain("Blocked");
      expect(html).toContain("Resolved");
      expect(html).toContain("Open");
      expect(html).toContain("Thread");
      expect(html).toContain("Direct");
      expect(html).toContain("TOM");
      expect(html).toContain("External");
      expect(html).toContain("—");
      expect(html).toContain("status-text status-escalated");
      expect(html).toContain("status-text status-risk");
      expect(html).not.toContain("Started by System");
    } finally {
      collaborationThreads.pop();
      collaborationThreads.pop();
      collaborationThreads.pop();
      collaborationThreads.pop();
      collaborationThreads.pop();
    }
  });

  it("renders forum dropdown triggers and menu items", () => {
    const html = renderToStaticMarkup(
      React.createElement(CollaborationSection, { initialToolsOpen: true })
    );
    expect(html).toContain("Search Forum ▾");
    expect(html).toContain("Forum Tools ▾");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("Mark all read");
    expect(html).toContain("Subscribe");
    expect(html).toContain("Export / Snapshot");
  });

  it("computes thread range and paging for 35 total items", () => {
    const metaPage1 = getThreadListPagerMeta(35, 20, 1, 20);
    expect(`Threads ${metaPage1.start} to ${metaPage1.end} of 35`).toBe("Threads 1 to 20 of 35");
    expect(`Page ${metaPage1.currentPage} of ${metaPage1.pageCount}`).toBe("Page 1 of 2");

    const metaPage2 = getThreadListPagerMeta(35, 20, 2, 15);
    expect(`Threads ${metaPage2.start} to ${metaPage2.end} of 35`).toBe("Threads 21 to 35 of 35");
    expect(`Page ${metaPage2.currentPage} of ${metaPage2.pageCount}`).toBe("Page 2 of 2");
    expect(metaPage2.currentPage === metaPage2.pageCount).toBe(true);
  });

  it("split right shows list and pane for thread route", () => {
    const html = renderToStaticMarkup(
      React.createElement(CollaborationSection, {
        initialPathname: "/collaboration/forum/thread/thr-001",
        initialReadingMode: "split_right",
        initialIsNarrow: false,
      })
    );
    expect(html).toContain("Title / Thread Starter");
    expect(html).toContain('aria-label="Close pane"');
  });

  it("full page hides list for thread route", () => {
    const html = renderToStaticMarkup(
      React.createElement(CollaborationSection, {
        initialPathname: "/collaboration/forum/thread/thr-001",
        initialReadingMode: "full_page",
        initialIsNarrow: false,
      })
    );
    expect(html).not.toContain("Title / Thread Starter");
    expect(html).toContain("Back to threads");
  });

  it("narrow width forces full page", () => {
    const html = renderToStaticMarkup(
      React.createElement(CollaborationSection, {
        initialPathname: "/collaboration/forum/thread/thr-001",
        initialReadingMode: "split_right",
        initialIsNarrow: true,
      })
    );
    expect(html).not.toContain("Title / Thread Starter");
  });

  it("uses stored reading mode on desktop", () => {
  });

  it("renders thread detail header counts and TOM for System author", () => {
    const html = renderToStaticMarkup(
      React.createElement(CollaborationSection, {
        initialPathname: "/collaboration/forum/thread/thr-002",
        initialReadingMode: "split_right",
        initialIsNarrow: false,
      })
    );
    expect(html).toContain("Participants:");
    expect(html).toContain("Likes:");
    expect(html).toContain("Acknowledged:");
    expect(html).toContain("Views:");
    expect(html).toContain("Watch");
    expect(html).toContain("TOM");
  });

  it("renders thread actions and disables reply when locked", () => {
    const lockedThread = {
      id: "thr-test-locked",
      title: "Locked thread for reply test",
      type: "operational",
      status: "open",
      priority: "green",
      source: "forum",
      isLocked: true,
      ownerId: "jrivers",
      participantIds: ["user-001"],
      watcherIds: [],
      linkedEntities: {},
      policy: { allowPII: false, allowAttachments: false, retentionClass: "standard" },
      createdAt: "2026-02-20T10:00:00Z",
      updatedAt: "2026-02-20T10:30:00Z",
      unreadCount: 0,
      lastMessage: "Locked.",
      provenance: [],
    } as const;

    collaborationThreads.push(lockedThread);
    try {
      const html = renderToStaticMarkup(
        React.createElement(CollaborationSection, {
          initialPathname: "/collaboration/forum/thread/thr-test-locked",
          initialReadingMode: "split_right",
          initialIsNarrow: false,
        })
      );
      expect(html).toContain("Reply");
      expect(html).toContain("Like");
      expect(html).toContain("Acknowledge");
      expect(html).toContain("Watch");
      expect(html).toContain("Thread locked");
      expect(html).toContain("disabled");
    } finally {
      collaborationThreads.pop();
    }
  });

  it("hides thread tools for non-mods and shows for moderators", () => {
    const originalRole = threadParticipants["user-001"]?.role;
    try {
      threadParticipants["user-001"].role = "Ops";
      const htmlNonMod = renderToStaticMarkup(
        React.createElement(CollaborationSection, {
          initialPathname: "/collaboration/forum/thread/thr-001",
          initialReadingMode: "split_right",
          initialIsNarrow: false,
        })
      );
      expect(htmlNonMod).not.toContain("Thread Tools ▾");

      threadParticipants["user-001"].role = "Service Delivery";
      const htmlMod = renderToStaticMarkup(
        React.createElement(CollaborationSection, {
          initialPathname: "/collaboration/forum/thread/thr-001",
          initialReadingMode: "split_right",
          initialIsNarrow: false,
        })
      );
      expect(htmlMod).toContain("Thread Tools ▾");
    } finally {
      if (threadParticipants["user-001"] && originalRole) {
        threadParticipants["user-001"].role = originalRole;
      }
    }
  });

  it("renders liked by list when modal is opened", () => {
    const html = renderToStaticMarkup(
      React.createElement(CollaborationSection, {
        initialPathname: "/collaboration/forum/thread/thr-001",
        initialReadingMode: "split_right",
        initialIsNarrow: false,
        initialActiveModal: "likes",
      })
    );
    expect(html).toContain("Liked by");
  });
});
