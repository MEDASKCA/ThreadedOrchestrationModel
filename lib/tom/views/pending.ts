export function buildPendingSummary(params: {
  planning?: any;
  collaboration?: any;
}): {
  summary: string;
  bullets: string[];
  counts: Record<string, number>;
} {
  const planningSessions = Array.isArray(params.planning?.sessions?.items) ? params.planning.sessions.items : [];
  const planningRoster = Array.isArray(params.planning?.roster_shifts?.items) ? params.planning.roster_shifts.items : [];
  const collaborationDeliverables = Array.isArray(params.collaboration?.deliverables?.items) ? params.collaboration.deliverables.items : [];
  const collaborationForum = Array.isArray(params.collaboration?.forum?.items) ? params.collaboration.forum.items : [];

  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = planningSessions.filter((item: any) => {
    if (typeof item?.date !== "string" || !item.date) return true;
    return item.date >= today;
  }).length;

  const unassignedShifts = planningRoster.some((item: any) => typeof item?.assigned === "boolean")
    ? planningRoster.filter((item: any) => item?.assigned === false).length
    : planningRoster.length;

  const openDeliverables = collaborationDeliverables.some((item: any) => typeof item?.status === "string")
    ? collaborationDeliverables.filter((item: any) => !["done", "completed", "resolved", "closed"].includes(String(item.status).toLowerCase())).length
    : collaborationDeliverables.length;

  const activeForumThreads = collaborationForum.some((item: any) => typeof item?.is_active === "boolean")
    ? collaborationForum.filter((item: any) => item?.is_active).length
    : collaborationForum.length;

  const counts = {
    planning_sessions: upcomingSessions,
    roster_shifts: unassignedShifts,
    collaboration_deliverables: openDeliverables,
    collaboration_forum: activeForumThreads,
  };

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const summary = total > 0
    ? `I found ${total} pending items across planning and collaboration.`
    : "I did not find pending items in planning or collaboration.";

  const bullets = [
    `Planning: ${counts.planning_sessions} sessions`,
    `Roster: ${counts.roster_shifts} shifts`,
    `Collaboration: ${counts.collaboration_deliverables} deliverables`,
    `Forum: ${counts.collaboration_forum} active threads`,
  ];

  return { summary, bullets, counts };
}
