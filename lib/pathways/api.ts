import { NextRequest } from "next/server";
import { FilterContext } from "./schema";

export const parseFilterContext = (request: NextRequest): FilterContext => {
  const params = request.nextUrl.searchParams;
  return {
    specialty: params.get("specialty") ?? undefined,
    consultant: params.get("consultant") ?? undefined,
    site: params.get("site") ?? undefined,
    date_from: params.get("date_from") ?? undefined,
    date_to: params.get("date_to") ?? undefined,
    search: params.get("search") ?? undefined,
    rtt_status: (params.get("rtt_status") as FilterContext["rtt_status"]) ?? undefined,
    stage: (params.get("stage") as FilterContext["stage"]) ?? undefined,
    priority: (params.get("priority") as FilterContext["priority"]) ?? undefined,
    owner_id: params.get("owner_id") ?? undefined,
  };
};
