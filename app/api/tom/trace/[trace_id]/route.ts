import { NextRequest, NextResponse } from "next/server";
import { getTrace } from "@/lib/tom/reasoning/trace-store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ trace_id: string }> | { trace_id: string } },
) {
  const params = await Promise.resolve(context.params);
  const trace = await getTrace(params.trace_id);

  if (!trace) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(trace, { status: 200 });
}
