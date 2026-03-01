import { prisma } from "@/lib/tom/db";
import type { RichNextAction, RichSection } from "@/lib/tom/rich-response";

export type OpenViewPayload = { type: "open_view"; deeplink: string; label?: string };
export type OpenCanvasPayload = { type: "open_canvas"; canvas: { title: string; markdown: string; kind?: "plan" | "checklist" | "summary"; blocks?: RichSection[] } };
export type PinPayload = { type: "pin"; pin: { title: string; markdown: string } };
export type OrchestrationPayload = OpenViewPayload | OpenCanvasPayload | PinPayload;

export type PendingAction = RichNextAction & {
  action_id: string;
  requires_confirmation: boolean;
  permission_scope?: string;
};

export type ActionResult = {
  ok: boolean;
  outcome: string;
  link?: string;
  actionId?: string;
};

export const hasPermission = (_userId: string | undefined, _scope?: string) => {
  return true;
};

export const executeAction = async (action: PendingAction, userId?: string): Promise<ActionResult> => {
  if (!hasPermission(userId, action.permission_scope)) {
    return { ok: false, outcome: "Permission denied" };
  }

  if (action.action_type === "open") {
    const typedPayload = action.payload as Partial<OrchestrationPayload> & Record<string, any> | undefined;
    const deeplink = typeof typedPayload?.deeplink === "string" ? typedPayload.deeplink : null;
    const view = action.payload?.view || "ptl";
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries({ section: "operations", view, ...(action.payload ?? {}) })
          .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
          .map(([key, value]) => [key, String(value)]),
      ),
    );
    const link = deeplink || `/?${params.toString()}`;
    await prisma.actionRequest.create({
      data: {
        actionType: action.action_type,
        label: action.label,
        rationale: action.rationale,
        payload: action.payload ?? {},
        status: "executed",
        userId: userId ?? null,
        executedAt: new Date(),
      },
    });
    return { ok: true, outcome: "Opened view", link, actionId: action.action_id };
  }

  if (action.action_type === "connect") {
    await prisma.actionRequest.create({
      data: {
        actionType: action.action_type,
        label: action.label,
        rationale: action.rationale,
        payload: action.payload ?? {},
        status: "executed",
        userId: userId ?? null,
        executedAt: new Date(),
      },
    });
    return { ok: true, outcome: "Connection request logged", actionId: action.action_id };
  }

  if (action.action_type === "filter") {
    const view = action.payload?.view || "ptl";
    const params = new URLSearchParams({ section: "operations", view, ...(action.payload ?? {}) });
    const link = `/?${params.toString()}`;
    await prisma.actionRequest.create({
      data: {
        actionType: action.action_type,
        label: action.label,
        rationale: action.rationale,
        payload: action.payload ?? {},
        status: "executed",
        userId: userId ?? null,
        executedAt: new Date(),
      },
    });
    return { ok: true, outcome: "Applied filter", link, actionId: action.action_id };
  }

  return { ok: false, outcome: "Unsupported action" };
};
