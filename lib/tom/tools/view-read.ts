import type { ToolResult } from "@/lib/tom/tools/types";
import { getViewById } from "@/lib/tom/views/registry";

export type ViewReadInput = {
  view_id?: string;
  view_ids?: string[];
  filters?: Record<string, any>;
};

export type ViewReadOutput = ToolResult<{
  view_id?: string;
  view_ids?: string[];
  data?: any;
  evidence?: any[];
  views?: Array<{ view_id: string; data: any }>;
  view?: { id: string; label: string };
}>;

export const readView = async (input: ViewReadInput): Promise<ViewReadOutput> => {
  if (Array.isArray(input.view_ids) && input.view_ids.length > 0) {
    const orderedIds = Array.from(new Set(input.view_ids));
    const views: Array<{ view_id: string; data: any }> = [];
    const evidence: any[] = [];

    for (const id of orderedIds) {
      const view = getViewById(id);
      // Skip unknown or unimplemented views — don't bail the whole batch
      if (!view || !view.implemented || !view.read) continue;
      const result = await view.read({ filters: input.filters });
      views.push({ view_id: view.id, data: result.data });
      if (Array.isArray(result.evidence)) {
        evidence.push(...result.evidence);
      }
    }

    return {
      ok: true,
      source: "VIEW",
      data: {
        view_ids: orderedIds,
        views,
        evidence,
      },
    };
  }

  if (!input.view_id) {
    return { ok: false, error: "unknown_view", data: { view_id: "" } };
  }

  const view = getViewById(input.view_id);
  if (!view) {
    return { ok: false, error: "unknown_view", data: { view_id: input.view_id } };
  }

  if (!view.implemented || !view.read) {
    return {
      ok: false,
      error: "not_implemented",
      data: {
        view: { id: view.id, label: view.label },
      },
    };
  }

  const result = await view.read({ filters: input.filters });
  return {
    ok: true,
    source: "VIEW",
    data: {
      view_id: view.id,
      data: result.data,
      evidence: result.evidence,
    },
  };
};
