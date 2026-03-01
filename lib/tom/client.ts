export type IntegrationStatuses = Record<string, { connected: boolean; environment?: string; lastSync?: string | null; error?: string | null }>;
export type TomAlert = { id: string; severity: "info" | "warning" | "critical"; title: string; detail: string; source: string };

export async function fetchIntegrationStatus() {
  const res = await fetch("/api/integrations/status");
  if (!res.ok) throw new Error("Failed to load integration status");
  return res.json();
}

export async function fetchTomAlerts(site?: string) {
  const url = site ? `/api/tom/alerts?site=${encodeURIComponent(site)}` : "/api/tom/alerts";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load TOM alerts");
  return res.json() as Promise<{ alerts: TomAlert[]; site: string }>;
}

export async function fetchPathways(query?: Record<string, string>) {
  const params = new URLSearchParams(query || {});
  const url = params.toString() ? `/api/epr/pathways?${params.toString()}` : "/api/epr/pathways";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load pathways");
  return res.json();
}
