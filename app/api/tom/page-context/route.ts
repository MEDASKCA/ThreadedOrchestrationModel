import { NextRequest, NextResponse } from "next/server";
import { getContext, updateContext } from "@/lib/tom/context";

type PageContextPayload = {
  sessionId?: string;
  page_context?: {
    section?: string;
    view?: string;
    filters?: Record<string, any>;
    deeplink?: string;
  };
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as PageContextPayload;
  const sessionId = String(body.sessionId || "").trim();
  const pageContext = body.page_context;

  if (!sessionId || !pageContext || typeof pageContext.section !== "string" || !pageContext.section.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  // Ensure session exists before patching.
  getContext(sessionId);
  updateContext(sessionId, {
    page_context: {
      section: pageContext.section,
      view: pageContext.view,
      filters: pageContext.filters,
      deeplink: pageContext.deeplink,
      updated_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
