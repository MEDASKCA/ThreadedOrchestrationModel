import type { ViewSpec } from "./types";

const sectionLabel = (section: string) => {
  const s = String(section || "").toLowerCase();
  if (!s) return "Section";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const toDeeplink = (viewId: string, section: string) => {
  const id = String(viewId || "");
  if (id === "planning.sessions") return "/?section=planning&view=sessions";
  if (id === "planning.roster_shifts") return "/?section=planning&view=roster_shifts";
  if (id === "collaboration.deliverables") return "/?section=collaboration&view=deliverables";
  if (id === "collaboration.forum") return "/?section=collaboration&view=forum";
  if (id === "operations.ptl") return "/?section=operations&view=ptl";
  if (id === "operations.access_pathways_waiting_list" || id === "operations.waiting") return "/?section=operations&view=waiting";
  if (id === "operations.access_pathways_rtt_monitoring" || id === "operations.rtt") return "/?section=operations&view=rtt";
  if (id === "operations.cancer_2ww" || id === "operations.cancer") return "/?section=operations&view=cancer";
  if (id === "operations.referral_management" || id === "operations.referrals") return "/?section=operations&view=referrals";
  if (id === "operations.triage_status" || id === "operations.triage") return "/?section=operations&view=triage";
  if (id === "operations.breach_tracking" || id === "operations.breach") return "/?section=operations&view=breach";
  if (id === "operations.pathway_milestones" || id === "operations.milestones") return "/?section=operations&view=milestones";
  if (id === "operations.clock_starts_stops" || id === "operations.clock") return "/?section=operations&view=clock";
  if (id === "operations.validation_data_quality" || id === "operations.validation") return "/?section=operations&view=validation";
  if (id === "logistics.roster_shifts") return "/?section=logistics&view=roster";
  if (id === "logistics.inventory_stock") return "/?section=logistics&view=inventory";
  return `/?section=${section}`;
};

const buildOverviewMarkdown = (section: string, views: ViewSpec[]) => {
  const heading = sectionLabel(section);
  const lines = [`## ${heading} overview`, "", "Available views:"];
  for (const view of views.slice(0, 6)) {
    lines.push(`- ${view.label}${view.implemented ? "" : " (not implemented yet)"}`);
  }
  lines.push("", "## Next step", `- [ ] Open a ${heading} view and continue from there`);
  return lines.join("\n");
};

export function buildSectionOverview(params: {
  section: string;
  registry: ViewSpec[];
}): { title: string; summary: string; bullets: string[]; actions: any[]; canvas?: { title: string; markdown: string } } {
  const section = String(params.section || "").toLowerCase();
  const views = params.registry
    .filter((view) => String(view.section || "").toLowerCase() === section)
    .sort((a, b) => {
      if (a.implemented !== b.implemented) return a.implemented ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

  const topViews = views.slice(0, 6);
  const bullets = topViews.map((view) => `${view.label}${view.implemented ? "" : " (coming soon)"}`);
  const heading = sectionLabel(section);
  const summary = topViews.length > 0
    ? `${heading} has ${views.length} registered views. Here are the most relevant pages to open next.`
    : `${heading} is available, but no pages are registered yet.`;

  const actions: any[] = [];
  for (const view of topViews.slice(0, 3)) {
    actions.push({
      label: `Open ${view.label}`,
      rationale: `Go directly to ${view.label}.`,
      action_type: "open",
      payload: { type: "open_view", deeplink: toDeeplink(view.id, section), label: view.label },
    });
  }

  const canvas = {
    title: `${heading} overview`,
    markdown: buildOverviewMarkdown(section, topViews),
  };
  actions.push({
    label: "Open overview canvas",
    rationale: "Open a compact section overview workspace.",
    action_type: "open",
    payload: { type: "open_canvas", canvas: { title: canvas.title, markdown: canvas.markdown, kind: "summary" } },
  });

  return {
    title: `${heading} overview`,
    summary,
    bullets,
    actions,
    canvas,
  };
}
