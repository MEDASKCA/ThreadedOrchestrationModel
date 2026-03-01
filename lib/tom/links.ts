export const allowedViews = new Set([
  "ptl",
  "waiting",
  "rtt",
  "cancer",
  "referrals",
  "triage",
  "breach",
  "milestones",
  "clock",
  "validation",
]);

export const isAllowedInternalLink = (link?: string | null) => {
  if (!link) return false;
  try {
    const url = new URL(link, "http://localhost");
    if (url.pathname !== "/") return false;
    if (url.searchParams.get("section") !== "operations") return false;
    const view = url.searchParams.get("view") || "";
    return allowedViews.has(view);
  } catch {
    return false;
  }
};
