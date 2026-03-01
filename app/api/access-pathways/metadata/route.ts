import { NextResponse } from "next/server";
import {
  CLOCK_STATUSES,
  PATHWAY_STAGES,
  PRIORITIES,
  RTT_STATUSES,
  VALIDATION_STATUSES,
} from "@/lib/pathways/schema";
import { PATHWAY_THRESHOLDS } from "@/lib/pathways/constants";

export async function GET() {
  return NextResponse.json({
    enums: {
      pathway_stages: PATHWAY_STAGES,
      rtt_statuses: RTT_STATUSES,
      priorities: PRIORITIES,
      validation_statuses: VALIDATION_STATUSES,
      clock_statuses: CLOCK_STATUSES,
    },
    thresholds: PATHWAY_THRESHOLDS,
    updated_at: new Date().toISOString(),
  });
}
